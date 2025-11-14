import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Animated,
  PanResponder,
  LayoutAnimation,
  ScrollView,
} from 'react-native';
import { loadCrushes, saveCrushes, clearAllCrushes, sanitizeInput } from '../utils/storage';

export default function CrushListScreen({ navigation }) {
  const [crushes, setCrushes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCrushName, setNewCrushName] = useState('');
  const [newCrushDescription, setNewCrushDescription] = useState('');
  const [cemeteryModalVisible, setCemeteryModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOrder, setDragOrder] = useState([]);
  const [hoverIndex, setHoverIndex] = useState(null);

  const scrollOffsetRef = useRef(0);
  const itemHeightRef = useRef(100); // Estimated, will be measured
  const dragStartIndexRef = useRef(null);
  const itemPositions = useRef({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  // Add settings icon to navigation header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={() => setSettingsModalVisible(true)}
        >
          <Text style={{ fontSize: 28, color: '#fff' }}>⋮</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const loadData = async () => {
    const data = await loadCrushes();
    setCrushes(data);
  };

  const addCrush = async () => {
    const sanitizedName = sanitizeInput(newCrushName);
    const sanitizedDescription = sanitizeInput(newCrushDescription);

    if (sanitizedName === '') {
      Alert.alert('Erreur', 'Veuillez entrer un nom valide');
      return;
    }

    try {
      const newCrush = {
        id: Date.now().toString(),
        name: sanitizedName,
        description: sanitizedDescription,
        mistakes: 0,
        pros: [],
        cons: [],
        qualities: [],
        defects: [],
        feelings: 50, // Start at 50% (neutral)
        order: crushes.length, // Add at the end
        createdAt: new Date().toISOString(),
      };

      const updatedCrushes = [...crushes, newCrush];
      setCrushes(updatedCrushes);
      await saveCrushes(updatedCrushes);

      setNewCrushName('');
      setNewCrushDescription('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les données');
    }
  };

  const deleteCrush = async (id) => {
    Alert.alert(
      'Supprimer le Crush',
      'Êtes-vous sûr de vouloir supprimer ce crush ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const updatedCrushes = crushes.filter(c => c.id !== id);
            setCrushes(updatedCrushes);
            await saveCrushes(updatedCrushes);
          },
        },
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Effacer toutes les données',
      'Êtes-vous sûr de vouloir supprimer tous les crushes ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: async () => {
            await clearAllCrushes();
            setCrushes([]);
          },
        },
      ]
    );
  };

  const saveReorderedCrushes = async () => {
    const activeCrushes = crushes.filter(c => c.mistakes < 5);
    const destroyedCrushes = crushes.filter(c => c.mistakes >= 5);

    // Map dragOrder back to actual crushes with updated order
    const reorderedActive = dragOrder.map((crush, idx) => ({
      ...crush,
      order: idx,
    }));

    const updatedAll = [...reorderedActive, ...destroyedCrushes];
    await saveCrushes(updatedAll);
    setCrushes(updatedAll);
  };

  const toggleReorderMode = () => {
    if (!reorderMode) {
      // Entering reorder mode - initialize drag order
      const activeCrushes = crushes.filter(c => c.mistakes < 5);
      setDragOrder(activeCrushes);
      setReorderMode(true);
      setSettingsModalVisible(false);
    } else {
      // Exiting reorder mode - save changes
      saveReorderedCrushes();
      setReorderMode(false);
    }
  };

  const getHeartColor = (livesLeft) => {
    if (livesLeft === 0) return '#333';
    if (livesLeft <= 1) return '#FF4444';
    if (livesLeft <= 2) return '#FF9800';
    if (livesLeft <= 3) return '#FFC107';
    return '#FF6B9D';
  };

  // Separate active and destroyed crushes
  const activeCrushes = crushes.filter(c => c.mistakes < 5);
  const destroyedCrushes = crushes.filter(c => c.mistakes >= 5);

  const renderCrush = ({ item }) => {
    const livesLeft = 5 - item.mistakes;

    return (
      <TouchableOpacity
        style={styles.crushCard}
        onPress={() => navigation.navigate('CrushDetail', { crushId: item.id })}
        onLongPress={() => deleteCrush(item.id)}
      >
        <View style={styles.crushCardContent}>
          <Text style={styles.crushName}>{item.name}</Text>
          <View style={styles.heartContainer}>
            {[...Array(5)].map((_, idx) => (
              <Text key={idx} style={styles.heartIcon}>
                {idx < livesLeft ? '❤️' : '💔'}
              </Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDestroyedCrush = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.cemeteryItem}
        onPress={() => {
          setCemeteryModalVisible(false);
          navigation.navigate('CrushDetail', { crushId: item.id });
        }}
      >
        <Text style={styles.cemeteryName}>☠️ {item.name}</Text>
        <Text style={styles.cemeteryDate}>
          {new Date(item.createdAt).toLocaleDateString('fr-FR')}
        </Text>
      </TouchableOpacity>
    );
  };

  // Draggable Item Component - Memoized to prevent re-renders during drag
  const DraggableItem = React.memo(({ item, index }) => {
    const [pan] = useState(() => new Animated.ValueXY());
    const hoverIndexRef = useRef(index);

    const panResponder = React.useMemo(() =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          dragStartIndexRef.current = index;
          hoverIndexRef.current = index;
          setDraggingId(item.id);
        },

        onPanResponderMove: (evt, gestureState) => {
          // Update position - this doesn't cause re-renders
          pan.setValue({ x: 0, y: gestureState.dy });

          // Calculate target position using refs only - NO state updates
          const currentItemHeight = itemHeightRef.current;
          const offset = gestureState.dy / currentItemHeight;
          const targetIndex = Math.round(dragStartIndexRef.current + offset);
          const clampedIndex = Math.max(0, Math.min(dragOrder.length - 1, targetIndex));

          // Only store in ref - DO NOT call setState to avoid re-renders
          hoverIndexRef.current = clampedIndex;
        },

        onPanResponderRelease: () => {
          // Perform the reorder on release
          const finalHoverIndex = hoverIndexRef.current;
          if (finalHoverIndex !== null && dragStartIndexRef.current !== null && dragStartIndexRef.current !== finalHoverIndex) {
            const newOrder = [...dragOrder];
            const [movedItem] = newOrder.splice(dragStartIndexRef.current, 1);
            newOrder.splice(finalHoverIndex, 0, movedItem);
            setDragOrder(newOrder);
          }

          // Reset state
          setDraggingId(null);
          dragStartIndexRef.current = null;

          // Animate back to original position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        },
      }), [pan, item.id, index]
    );

    const livesLeft = 5 - item.mistakes;
    const isBeingDragged = draggingId === item.id;

    return (
      <Animated.View
        collapsable={false}
        style={[
          styles.reorderItem,
          {
            transform: pan.getTranslateTransform(),
            opacity: isBeingDragged ? 0.7 : 1,
            shadowOpacity: isBeingDragged ? 0.3 : 0.1,
            zIndex: isBeingDragged ? 1000 : 1,
            elevation: isBeingDragged ? 8 : 2,
          },
        ]}
        {...panResponder.panHandlers}
        onLayout={(e) => {
          const height = e.nativeEvent.layout.height;
          itemHeightRef.current = height + 10; // height + marginBottom
        }}
      >
        <View style={styles.dragHandleContainer}>
          <Text style={styles.dragHandle}>☰</Text>
        </View>
        <View style={styles.reorderItemContent}>
          <Text style={styles.reorderItemName}>{item.name}</Text>
          <View style={styles.reorderHeartContainer}>
            {[...Array(5)].map((_, idx) => (
              <Text key={idx} style={styles.reorderHeartIcon}>
                {idx < livesLeft ? '❤️' : '💔'}
              </Text>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  });

  return (
    <View style={styles.container}>
      {/* Reorder Mode Banner */}
      {reorderMode && (
        <View style={styles.reorderBanner}>
          <Text style={styles.reorderBannerText}>Maintenez et glissez pour réorganiser</Text>
          <TouchableOpacity onPress={toggleReorderMode}>
            <Text style={styles.reorderBannerButton}>Terminer</Text>
          </TouchableOpacity>
        </View>
      )}

      {reorderMode ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        >
          {dragOrder.map((item, index) => (
            <DraggableItem key={item.id} item={item} index={index} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={activeCrushes}
          renderItem={renderCrush}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun crush pour l'instant</Text>
              <Text style={styles.emptySubtext}>Utilisez la barre de navigation</Text>
            </View>
          }
        />
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setCemeteryModalVisible(true)}
        >
          <View>
            <Text style={styles.navIcon}>🪦</Text>
            {destroyedCrushes.length > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{destroyedCrushes.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navLabel}>Cimetière</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary]}
          onPress={() => setModalVisible(true)}
          testID="open-add-modal-button"
          accessibilityLabel="Ouvrir le formulaire d'ajout"
        >
          <Text style={styles.navIconLarge}>+</Text>
          <Text style={[styles.navLabel, styles.navLabelWhite]}>Ajouter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={clearAllData}
        >
          <Text style={styles.navIcon}>🗑️</Text>
          <Text style={styles.navLabel}>Effacer</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un Nouveau Crush</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={newCrushName}
              onChangeText={setNewCrushName}
              autoFocus
              maxLength={50}
            />

            <TextInput
              style={styles.inputDescription}
              placeholder="Description (optionnelle)"
              value={newCrushDescription}
              onChangeText={setNewCrushDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewCrushName('');
                  setNewCrushDescription('');
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addCrush}
                testID="modal-add-crush-button"
                accessibilityLabel="Ajouter le crush"
              >
                <Text style={styles.confirmButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cemetery Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cemeteryModalVisible}
        onRequestClose={() => setCemeteryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.cemeteryModal]}>
            <Text style={styles.modalTitle}>🪦 Cimetière des Crushes</Text>

            <FlatList
              data={destroyedCrushes}
              renderItem={renderDestroyedCrush}
              keyExtractor={item => item.id}
              style={styles.cemeteryList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Aucun crush game over</Text>
                </View>
              }
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, styles.closeCemeteryButton]}
              onPress={() => setCemeteryModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <Text style={styles.modalTitle}>Paramètres</Text>

            <TouchableOpacity
              style={styles.settingsOption}
              onPress={toggleReorderMode}
            >
              <Text style={styles.settingsOptionIcon}>↕️</Text>
              <View style={styles.settingsOptionTextContainer}>
                <Text style={styles.settingsOptionTitle}>Réorganiser</Text>
                <Text style={styles.settingsOptionSubtitle}>Changer l'ordre des crushes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsOption}
              onPress={() => {
                setSettingsModalVisible(false);
                clearAllData();
              }}
            >
              <Text style={styles.settingsOptionIcon}>🗑️</Text>
              <View style={styles.settingsOptionTextContainer}>
                <Text style={[styles.settingsOptionTitle, styles.dangerText]}>Effacer toutes les données</Text>
                <Text style={styles.settingsOptionSubtitle}>Supprimer tous les crushes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Fermer</Text>
            </TouchableOpacity>
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
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  crushCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  crushCardDragging: {
    opacity: 0.7,
    elevation: 10,
    shadowOpacity: 0.3,
  },
  crushCardReorderMode: {
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  crushCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crushName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  heartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  heartIcon: {
    fontSize: 24,
    marginHorizontal: 2,
  },
  reorderBanner: {
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B9D',
  },
  reorderBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  reorderBannerButton: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  dragHandle: {
    fontSize: 28,
    color: '#FF6B9D',
    marginRight: 12,
    fontWeight: 'bold',
  },
  crushNameReorder: {
    flex: 1,
  },
  settingsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingsOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  settingsOptionTextContainer: {
    flex: 1,
  },
  settingsOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingsOptionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  dangerText: {
    color: '#FF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 24,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#CCC',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
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
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
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
    backgroundColor: '#FF6B9D',
  },
  closeButton: {
    marginTop: 10,
  },
  closeCemeteryButton: {
    flex: 0,
    alignSelf: 'center',
    paddingHorizontal: 60,
    paddingTop: 12,
    paddingBottom: 12,
    marginHorizontal: 0,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  cemeteryModal: {
    height: '70%',
    maxHeight: 500,
  },
  cemeteryList: {
    flex: 1,
    width: '100%',
    marginVertical: 10,
  },
  cemeteryItem: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cemeteryName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  cemeteryDate: {
    fontSize: 14,
    color: '#999',
  },
  bottomNavBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navButtonPrimary: {
    backgroundColor: '#FF6B9D',
    marginHorizontal: 10,
    borderRadius: 12,
  },
  navIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  navIconLarge: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  navLabelWhite: {
    color: '#fff',
  },
  navBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  reorderModal: {
    height: '70%',
    maxHeight: 500,
  },
  reorderList: {
    flex: 1,
    width: '100%',
    marginVertical: 10,
  },
  reorderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reorderItemHover: {
    backgroundColor: '#FFE8F0',
  },
  reorderItemName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reorderButton: {
    backgroundColor: '#FF6B9D',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  reorderButtonDisabled: {
    backgroundColor: '#DDD',
    opacity: 0.5,
  },
  reorderButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  dragHandleContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reorderHeartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  reorderHeartIcon: {
    fontSize: 18,
    marginHorizontal: 1,
  },
  reorderSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
});
