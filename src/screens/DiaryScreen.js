import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { loadCrushes, saveCrushes, sanitizeInput, loadThemeColor } from '../utils/storage';

export default function DiaryScreen({ route, navigation }) {
  const { crushId } = route.params;

  // Load handwritten font
  const [fontsLoaded] = useFonts({
    Caveat_400Regular,
    Caveat_700Bold,
  });

  const [crush, setCrush] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [themeColor, setThemeColor] = useState('#FF6B9D');
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  useEffect(() => {
    loadCrush();
  }, []);

  const loadCrush = async () => {
    const crushes = await loadCrushes();
    const foundCrush = crushes.find(c => c.id === crushId);
    if (foundCrush) {
      setCrush(foundCrush);
      navigation.setOptions({ title: `Journal de ${foundCrush.name}` });
    }

    // Load theme color
    const color = await loadThemeColor();
    setThemeColor(color);
  };

  const updateCrush = async (updatedCrush) => {
    const crushes = await loadCrushes();
    const updatedCrushes = crushes.map(c =>
      c.id === crushId ? updatedCrush : c
    );
    await saveCrushes(updatedCrushes);
    setCrush(updatedCrush);
  };

  const addEntry = async () => {
    const sanitizedTitle = sanitizeInput(entryTitle);
    const sanitizedDescription = sanitizeInput(entryDescription);

    if (sanitizedTitle === '') {
      Alert.alert('Erreur', 'Veuillez entrer un titre valide');
      return;
    }

    try {
      const newEntry = {
        id: Date.now().toString(),
        title: sanitizedTitle,
        description: sanitizedDescription,
        createdAt: new Date().toISOString(),
      };

      const updatedCrush = {
        ...crush,
        diaryEntries: [newEntry, ...(crush.diaryEntries || [])],
      };

      await updateCrush(updatedCrush);
      setEntryTitle('');
      setEntryDescription('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'entrée');
    }
  };

  const removeEntry = async (id) => {
    Alert.alert(
      'Supprimer l\'entrée',
      'Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const updatedCrush = {
              ...crush,
              diaryEntries: (crush.diaryEntries || []).filter(e => e.id !== id),
            };
            await updateCrush(updatedCrush);
            setDetailModalVisible(false);
          },
        },
      ]
    );
  };

  const viewEntryDetails = (entry) => {
    setSelectedEntry(entry);
    setDetailModalVisible(true);
    setIsEditingEntry(false);
  };

  const startEditingEntry = () => {
    setEditedDescription(selectedEntry?.description || '');
    setIsEditingEntry(true);
  };

  const saveEditedEntry = async () => {
    const sanitizedDescription = sanitizeInput(editedDescription);

    try {
      const updatedEntries = (crush.diaryEntries || []).map(entry =>
        entry.id === selectedEntry.id
          ? { ...entry, description: sanitizedDescription }
          : entry
      );

      const updatedCrush = {
        ...crush,
        diaryEntries: updatedEntries,
      };

      await updateCrush(updatedCrush);
      setSelectedEntry({ ...selectedEntry, description: sanitizedDescription });
      setIsEditingEntry(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    }
  };

  const cancelEditingEntry = () => {
    setIsEditingEntry(false);
    setEditedDescription('');
  };

  if (!crush || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const diaryEntries = crush.diaryEntries || [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {diaryEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyText}>Aucune entrée dans le journal</Text>
            <Text style={styles.emptySubtext}>Appuyez sur le + pour ajouter une note</Text>
          </View>
        ) : (
          diaryEntries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[styles.entryCard, { borderLeftColor: themeColor }]}
              onPress={() => viewEntryDetails(entry)}
            >
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <Text style={styles.entryDate}>
                  {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
              {entry.description && (
                <Text style={styles.entryPreview} numberOfLines={2}>
                  {entry.description}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: themeColor }]}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Entry Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle entrée</Text>

            <TextInput
              style={styles.inputTitle}
              placeholder="Titre"
              value={entryTitle}
              onChangeText={setEntryTitle}
              autoFocus
              maxLength={100}
            />

            <TextInput
              style={styles.inputDescription}
              placeholder="Description (optionnelle)"
              value={entryDescription}
              onChangeText={setEntryDescription}
              multiline
              numberOfLines={6}
              maxLength={1000}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEntryTitle('');
                  setEntryDescription('');
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: themeColor }]}
                onPress={addEntry}
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
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedEntry?.title || ''}</Text>
              {!isEditingEntry && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={startEditingEntry}
                >
                  <MaterialIcons name="edit" size={20} color={themeColor} />
                </TouchableOpacity>
              )}
            </View>

            {isEditingEntry ? (
              <TextInput
                style={styles.editDescriptionInput}
                placeholder="Description (optionnelle)"
                value={editedDescription}
                onChangeText={setEditedDescription}
                multiline
                numberOfLines={6}
                maxLength={1000}
                autoFocus
              />
            ) : (
              selectedEntry?.description && (
                <Text style={styles.detailDescription}>{selectedEntry.description}</Text>
              )
            )}

            <Text style={styles.detailDate}>
              {selectedEntry?.createdAt && new Date(selectedEntry.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            {isEditingEntry ? (
              <View style={styles.detailButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={cancelEditingEntry}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, { backgroundColor: themeColor }]}
                  onPress={saveEditedEntry}
                >
                  <Text style={styles.confirmButtonText}>Sauvegarder</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.detailButtons}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeEntry(selectedEntry?.id)}
                >
                  <MaterialIcons name="delete" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.detailCloseButton, { backgroundColor: themeColor }]}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.detailCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B9D',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  entryDate: {
    fontSize: 12,
    color: '#999',
  },
  entryPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#FF6B9D',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    width: '85%',
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#FF6B9D',
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
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginBottom: 0,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  editDescriptionInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 120,
    textAlignVertical: 'top',
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
  detailButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 24,
  },
});
