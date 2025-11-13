import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Circle, Path } from 'react-native-svg';
import { loadCrushes, saveCrushes, sanitizeInput } from '../utils/storage';

const { width } = Dimensions.get('window');
const SIZE = 60;
const RADIUS = SIZE / 2;
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function CrushDetailScreen({ route, navigation }) {
  const { crushId } = route.params;
  const [crush, setCrush] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState(null); // 'pro' or 'con'
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [editDescriptionModalVisible, setEditDescriptionModalVisible] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [animatingDestruction, setAnimatingDestruction] = useState(false);
  const [showPacman, setShowPacman] = useState(false);
  const [eatingHeartIndex, setEatingHeartIndex] = useState(-1);
  const [isAnimatingHeart, setIsAnimatingHeart] = useState(false);

  // New state for qualities, defects, and feelings
  const [traitModalVisible, setTraitModalVisible] = useState(false);
  const [traitType, setTraitType] = useState(null); // 'quality' or 'defect'
  const [traitText, setTraitText] = useState('');

  // Animated values using useRef
  const pacmanX = useRef(new Animated.Value(-100)).current;
  const pacmanMouth = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCrush();
  }, []);

  const loadCrush = async () => {
    const crushes = await loadCrushes();
    const foundCrush = crushes.find(c => c.id === crushId);
    if (foundCrush) {
      setCrush(foundCrush);
      navigation.setOptions({ title: foundCrush.name });
    }
  };

  const updateCrush = async (updatedCrush, delayDestruction = false) => {
    const crushes = await loadCrushes();
    const updatedCrushes = crushes.map(c =>
      c.id === crushId ? updatedCrush : c
    );
    await saveCrushes(updatedCrushes);
    setCrush(updatedCrush);

    // Check if crush should be destroyed
    if (updatedCrush.mistakes >= 5) {
      const showDestructionAlert = () => {
        Alert.alert(
          '☠️ GAME OVER ☠️',
          `${updatedCrush.name} a perdu après 5 erreurs. Il a été déplacé au cimetière.`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      };

      if (delayDestruction) {
        // Wait for Pac-Man animation to finish (6000ms + 500ms buffer)
        setTimeout(() => {
          setAnimatingDestruction(false);
          showDestructionAlert();
        }, 6500);
      } else {
        setAnimatingDestruction(false);
        showDestructionAlert();
      }
    }
  };

  const addAction = async () => {
    const sanitizedTitle = sanitizeInput(actionTitle);
    const sanitizedDescription = sanitizeInput(actionDescription);

    if (sanitizedTitle === '') {
      Alert.alert('Erreur', 'Veuillez entrer un titre valide');
      return;
    }

    try {
      const newAction = {
        id: Date.now().toString(),
        title: sanitizedTitle,
        description: sanitizedDescription,
        createdAt: new Date().toISOString(),
      };

      let updatedCrush = { ...crush };

      if (actionType === 'pro') {
        updatedCrush.pros = [...crush.pros, newAction];
        await updateCrush(updatedCrush);
      } else {
        updatedCrush.cons = [...crush.cons, newAction];
        const livesBeforeAction = 5 - crush.mistakes;
        updatedCrush.mistakes = crush.mistakes + 1;

        // Check if this will destroy the crush
        const willBeDestroyed = updatedCrush.mistakes >= 5;
        if (willBeDestroyed) {
          setAnimatingDestruction(true);
        }

        // Trigger Pacman animation when adding a bad action
        playPacmanAnimation(livesBeforeAction);
        // Delay destruction alert until after animation
        await updateCrush(updatedCrush, willBeDestroyed);
      }

      setActionTitle('');
      setActionDescription('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'action');
    }
  };

  const removeAction = async (id, type) => {
    Alert.alert(
      'Supprimer l\'Action',
      'Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            let updatedCrush = { ...crush };

            if (type === 'pro') {
              updatedCrush.pros = crush.pros.filter(p => p.id !== id);
            } else {
              updatedCrush.cons = crush.cons.filter(c => c.id !== id);
              // Reduce mistake count when removing a con
              updatedCrush.mistakes = Math.max(0, crush.mistakes - 1);
            }

            await updateCrush(updatedCrush);
          },
        },
      ]
    );
  };

  const openModal = (type) => {
    if (crush.mistakes >= 5) {
      Alert.alert('Game Over', 'Ce crush est game over et ne peut plus être modifié.');
      return;
    }
    setActionType(type);
    setModalVisible(true);
  };

  const viewActionDetails = (action) => {
    setSelectedAction(action);
    setDetailModalVisible(true);
  };

  const openEditDescription = () => {
    setEditedDescription(crush.description || '');
    setEditDescriptionModalVisible(true);
  };

  const saveDescription = async () => {
    try {
      const sanitizedDescription = sanitizeInput(editedDescription);
      const updatedCrush = {
        ...crush,
        description: sanitizedDescription,
      };
      await updateCrush(updatedCrush);
      setEditDescriptionModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la description');
    }
  };

  // New functions for qualities, defects, and feelings
  const openTraitModal = (type) => {
    if (crush.mistakes >= 5) {
      Alert.alert('Game Over', 'Ce crush est game over et ne peut plus être modifié.');
      return;
    }
    setTraitType(type);
    setTraitModalVisible(true);
  };

  const addTrait = async () => {
    const sanitizedText = sanitizeInput(traitText);

    if (sanitizedText === '') {
      Alert.alert('Erreur', 'Veuillez entrer un texte valide');
      return;
    }

    try {
      const newTrait = {
        id: Date.now().toString(),
        text: sanitizedText,
        createdAt: new Date().toISOString(),
      };

      let updatedCrush = { ...crush };

      if (traitType === 'quality') {
        updatedCrush.qualities = [...(crush.qualities || []), newTrait];
      } else if (traitType === 'defect') {
        updatedCrush.defects = [...(crush.defects || []), newTrait];
      }

      await updateCrush(updatedCrush);
      setTraitText('');
      setTraitModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
  };

  const removeTrait = async (id, type) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            let updatedCrush = { ...crush };

            if (type === 'quality') {
              updatedCrush.qualities = (crush.qualities || []).filter(q => q.id !== id);
            } else if (type === 'defect') {
              updatedCrush.defects = (crush.defects || []).filter(d => d.id !== id);
            }

            await updateCrush(updatedCrush);
          },
        },
      ]
    );
  };

  const updateFeelings = async (value) => {
    try {
      const updatedCrush = {
        ...crush,
        feelings: Math.round(value),
      };
      await updateCrush(updatedCrush);
    } catch (error) {
      console.error('Error updating feelings:', error);
    }
  };

  const stopPacman = () => {
    pacmanMouth.stopAnimation();
    pacmanX.setValue(-100);
    pacmanMouth.setValue(0);
    heartScale.setValue(1);
    heartRotation.setValue(0);
    setShowPacman(false);
    setEatingHeartIndex(-1);
    setIsAnimatingHeart(false);
  };

  const playPacmanAnimation = (livesBeforeAction) => {
    // Target the heart that will be lost (the last remaining one)
    const heartToEat = livesBeforeAction - 1;
    setEatingHeartIndex(heartToEat);
    setIsAnimatingHeart(true);

    setShowPacman(true);
    pacmanX.setValue(-100);
    heartScale.setValue(1);
    heartRotation.setValue(0);
    pacmanMouth.setValue(0);

    // Calculate approximate position of the heart to eat
    // Hearts are centered in the header, each about 40px apart
    const centerX = width / 2;
    const heartSpacing = 44; // 36 (icon) + 8 (margin)
    const heartX = centerX - (2.5 * heartSpacing) + (heartToEat * heartSpacing) - SIZE;

    // Calculate total distance and timing
    const totalDistance = width + SIZE;
    const distanceToHeart = heartX + 100;
    const timeToHeart = (distanceToHeart / totalDistance) * 6000;

    // Move Pac-Man all the way across
    Animated.timing(pacmanX, {
      toValue: width,
      duration: 6000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      // Wait a bit then reset
      setTimeout(() => stopPacman(), 300);
    });

    // Chomp animation (open ↔ close)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pacmanMouth, {
          toValue: 1,
          duration: 200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(pacmanMouth, {
          toValue: 0,
          duration: 200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate heart being eaten when Pac-Man reaches it
    setTimeout(() => {
      // Mark that the heart can now change
      setIsAnimatingHeart(false);
      Animated.parallel([
        Animated.timing(heartScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartRotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, timeToHeart);
  };

  if (!crush) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const livesLeft = 5 - crush.mistakes;
  const isDestroyed = crush.mistakes >= 5 && !animatingDestruction;

  const getHeartColor = (livesRemaining) => {
    if (livesRemaining === 0) return '#fff';
    if (livesRemaining <= 1) return '#FF4444';
    if (livesRemaining <= 2) return '#FF9800';
    if (livesRemaining <= 3) return '#FFC107';
    return '#FF6B9D';
  };

  // Animated mouth path
  const mouthPath = pacmanMouth.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `M ${RADIUS} ${RADIUS} L ${RADIUS + RADIUS * 1.6 * Math.cos((10 * Math.PI) / 180)} ${RADIUS - RADIUS * 1.6 * Math.sin((10 * Math.PI) / 180)} L ${RADIUS + RADIUS * 1.6 * Math.cos((-10 * Math.PI) / 180)} ${RADIUS - RADIUS * 1.6 * Math.sin((-10 * Math.PI) / 180)} Z`,
      `M ${RADIUS} ${RADIUS} L ${RADIUS + RADIUS * 1.6 * Math.cos((45 * Math.PI) / 180)} ${RADIUS - RADIUS * 1.6 * Math.sin((45 * Math.PI) / 180)} L ${RADIUS + RADIUS * 1.6 * Math.cos((-45 * Math.PI) / 180)} ${RADIUS - RADIUS * 1.6 * Math.sin((-45 * Math.PI) / 180)} Z`,
    ],
  });

  const heartRotationDeg = heartRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Pacman Animation */}
      {showPacman && (
        <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.pacman,
              {
                transform: [{ translateX: pacmanX }],
              },
            ]}
          >
            <Svg height={SIZE} width={SIZE} style={{ backgroundColor: 'transparent' }}>
              {/* Body */}
              <Circle cx={RADIUS} cy={RADIUS} r={RADIUS} fill="gold" />
              {/* Eye */}
              <Circle cx={RADIUS + 10} cy={RADIUS - 15} r={3} fill="black" />
              {/* Mouth (animated cutout) - match pink header background */}
              <AnimatedPath d={mouthPath} fill="#FF6B9D" />
            </Svg>
          </Animated.View>
        </View>
      )}

      <View style={[styles.header, isDestroyed && styles.destroyedHeader]}>
        <Text style={styles.headerTitle}>
          {isDestroyed ? '☠️ GAME OVER ☠️' : animatingDestruction ? '0 VIE RESTANTE' : `${livesLeft} ${livesLeft > 1 ? 'VIES RESTANTES' : 'VIE RESTANTE'}`}
        </Text>
        <View style={styles.heartBar}>
          {isDestroyed ? (
            <Text style={styles.destroyedIconLarge}>☠️</Text>
          ) : (
            [...Array(5)].map((_, index) => {
              const isBeingEaten = index === eatingHeartIndex;
              // Show heart as full while Pac-Man is moving towards it (isAnimatingHeart is true)
              // Once Pac-Man reaches it, isAnimatingHeart becomes false and the heart can change
              const showAsHeart = isBeingEaten && isAnimatingHeart ? true : index < livesLeft;
              return (
                <Animated.Text
                  key={index}
                  style={[
                    styles.heartIconLarge,
                    isBeingEaten && !isAnimatingHeart && {
                      transform: [
                        { scale: heartScale },
                        { rotate: heartRotationDeg },
                      ],
                    },
                  ]}
                >
                  {showAsHeart ? '❤️' : '💔'}
                </Animated.Text>
              );
            })
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Description Section */}
        {crush.description ? (
          <TouchableOpacity
            style={styles.descriptionSection}
            onPress={openEditDescription}
            disabled={isDestroyed}
          >
            <View style={styles.descriptionHeader}>
              <Text style={styles.descriptionTitle}>Description</Text>
              {!isDestroyed && <Text style={styles.editIcon}>✏️</Text>}
            </View>
            <Text style={styles.descriptionText}>{crush.description}</Text>
          </TouchableOpacity>
        ) : (
          !isDestroyed && (
            <TouchableOpacity
              style={styles.descriptionSection}
              onPress={openEditDescription}
            >
              <View style={styles.descriptionHeader}>
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.editIcon}>➕</Text>
              </View>
              <Text style={styles.emptyDescriptionText}>Appuyez pour ajouter une description</Text>
            </TouchableOpacity>
          )
        )}

        {/* Feelings Bar */}
        <View style={styles.feelingsSection}>
          <Text style={styles.feelingsTitle}>💗 Niveau de sentiments</Text>
          <View style={styles.feelingsContainer}>
            <Text style={styles.feelingsLabel}>😐</Text>
            <Slider
              style={styles.feelingsSlider}
              minimumValue={0}
              maximumValue={100}
              value={crush.feelings || 50}
              onSlidingComplete={updateFeelings}
              minimumTrackTintColor="#FF6B9D"
              maximumTrackTintColor="#DDD"
              thumbTintColor="#FF6B9D"
              disabled={isDestroyed}
            />
            <Text style={styles.feelingsLabel}>😍</Text>
          </View>
          <Text style={styles.feelingsValue}>{crush.feelings || 50}%</Text>
        </View>

        {/* Qualities Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ Qualités ({(crush.qualities || []).length})</Text>
            <TouchableOpacity
              style={styles.addActionButton}
              onPress={() => openTraitModal('quality')}
              disabled={isDestroyed}
            >
              <Text style={styles.addActionText}>+</Text>
            </TouchableOpacity>
          </View>

          {(crush.qualities || []).length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>Aucune qualité ajoutée</Text>
            </View>
          ) : (
            <View style={styles.traitsContainer}>
              {(crush.qualities || []).map((quality) => (
                <TouchableOpacity
                  key={quality.id}
                  style={[styles.traitChip, styles.qualityChip]}
                  onLongPress={() => removeTrait(quality.id, 'quality')}
                >
                  <Text style={styles.traitText}>{quality.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Defects Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚠️ Défauts ({(crush.defects || []).length})</Text>
            <TouchableOpacity
              style={[styles.addActionButton, styles.addBadButton]}
              onPress={() => openTraitModal('defect')}
              disabled={isDestroyed}
            >
              <Text style={styles.addActionText}>+</Text>
            </TouchableOpacity>
          </View>

          {(crush.defects || []).length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>Aucun défaut ajouté</Text>
            </View>
          ) : (
            <View style={styles.traitsContainer}>
              {(crush.defects || []).map((defect) => (
                <TouchableOpacity
                  key={defect.id}
                  style={[styles.traitChip, styles.defectChip]}
                  onLongPress={() => removeTrait(defect.id, 'defect')}
                >
                  <Text style={styles.traitText}>{defect.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Cons Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>❌ Mauvaises Actions / Erreurs ({crush.cons.length})</Text>
            <TouchableOpacity
              style={[styles.addActionButton, styles.addBadButton]}
              onPress={() => openModal('con')}
              disabled={isDestroyed}
              testID="add-bad-action-button"
              accessibilityLabel="Ajouter une mauvaise action"
            >
              <Text style={styles.addActionText}>+</Text>
            </TouchableOpacity>
          </View>

          {crush.cons.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>Aucune erreur pour l'instant</Text>
            </View>
          ) : (
            crush.cons.map((con) => (
              <TouchableOpacity
                key={con.id}
                style={[styles.actionItem, styles.badActionItem]}
                onPress={() => viewActionDetails(con)}
                onLongPress={() => removeAction(con.id, 'con')}
              >
                <Text style={styles.actionText}>{con.title || con.text}</Text>
                <Text style={styles.actionDate}>
                  {new Date(con.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pros Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✅ Bonnes Actions ({crush.pros.length})</Text>
            <TouchableOpacity
              style={styles.addActionButton}
              onPress={() => openModal('pro')}
              disabled={isDestroyed}
              testID="add-good-action-button"
              accessibilityLabel="Ajouter une bonne action"
            >
              <Text style={styles.addActionText}>+</Text>
            </TouchableOpacity>
          </View>

          {crush.pros.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>Aucune bonne action pour l'instant</Text>
            </View>
          ) : (
            crush.pros.map((pro) => (
              <TouchableOpacity
                key={pro.id}
                style={styles.actionItem}
                onPress={() => viewActionDetails(pro)}
                onLongPress={() => removeAction(pro.id, 'pro')}
              >
                <Text style={styles.actionText}>{pro.title || pro.text}</Text>
                <Text style={styles.actionDate}>
                  {new Date(pro.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'pro' ? 'Ajouter une Bonne Action' : 'Ajouter une Mauvaise Action / Erreur'}
            </Text>

            <TextInput
              style={styles.inputTitle}
              placeholder="Titre"
              value={actionTitle}
              onChangeText={setActionTitle}
              autoFocus
              maxLength={100}
            />

            <TextInput
              style={styles.inputDescription}
              placeholder="Description (optionnelle)"
              value={actionDescription}
              onChangeText={setActionDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            {actionType === 'con' && (
              <Text style={styles.warningText}>
                ⚠️ Ceci comptera comme une erreur ({livesLeft - 1} {livesLeft - 1 > 1 ? 'vies restantes' : 'vie restante'} après)
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setActionTitle('');
                  setActionDescription('');
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  actionType === 'pro' ? styles.confirmButton : styles.badButton,
                ]}
                onPress={addAction}
                testID="modal-add-action-button"
                accessibilityLabel="Ajouter l'action"
              >
                <Text style={styles.confirmButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.detailTitle}>
              {selectedAction?.title || selectedAction?.text || 'Détails de l\'Action'}
            </Text>

            {selectedAction?.description && (
              <Text style={styles.detailDescription}>{selectedAction.description}</Text>
            )}

            <Text style={styles.detailDate}>
              {selectedAction?.createdAt && new Date(selectedAction.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, styles.closeButton]}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Description Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editDescriptionModalVisible}
        onRequestClose={() => setEditDescriptionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier la Description</Text>

            <TextInput
              style={styles.inputDescription}
              placeholder="Ajouter une description..."
              value={editedDescription}
              onChangeText={setEditedDescription}
              multiline
              numberOfLines={6}
              autoFocus
              maxLength={500}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditDescriptionModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveDescription}
              >
                <Text style={styles.confirmButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trait Modal (Qualities/Defects) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={traitModalVisible}
        onRequestClose={() => setTraitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {traitType === 'quality' ? 'Ajouter une Qualité' : 'Ajouter un Défaut'}
            </Text>

            <TextInput
              style={styles.inputTitle}
              placeholder={traitType === 'quality' ? 'Ex: Drôle, Intelligent...' : 'Ex: Jaloux, Arrogant...'}
              value={traitText}
              onChangeText={setTraitText}
              autoFocus
              maxLength={50}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTraitText('');
                  setTraitModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  traitType === 'quality' ? styles.confirmButton : styles.badButton,
                ]}
                onPress={addTrait}
              >
                <Text style={styles.confirmButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF0F5',
  },
  header: {
    backgroundColor: '#FF6B9D',
    padding: 20,
    alignItems: 'center',
  },
  destroyedHeader: {
    backgroundColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  heartBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIconLarge: {
    fontSize: 36,
    marginHorizontal: 4,
  },
  destroyedIconLarge: {
    fontSize: 48,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBadButton: {
    backgroundColor: '#FF4444',
  },
  addActionText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  actionItem: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  badActionItem: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  actionDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputTitle: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inputDescription: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  warningText: {
    fontSize: 14,
    color: '#FF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  badButton: {
    backgroundColor: '#FF4444',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  detailDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  closeButton: {
    width: '100%',
    marginHorizontal: 0,
  },
  descriptionSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  editIcon: {
    fontSize: 18,
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  emptyDescriptionText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
  },
  animationContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 1000,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pacman: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1001,
  },
  // New styles for feelings and traits
  feelingsSection: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  feelingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  feelingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feelingsSlider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  feelingsLabel: {
    fontSize: 24,
  },
  feelingsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    textAlign: 'center',
    marginTop: 8,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  qualityChip: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  defectChip: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  traitText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
