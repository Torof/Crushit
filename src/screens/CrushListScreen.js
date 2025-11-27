import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFonts, DancingScript_400Regular, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { loadCrushes, saveCrushes, clearAllCrushes, sanitizeInput, loadThemeColor, saveThemeColor, loadBackgroundColor, saveBackgroundColor, loadColorPresets, saveColorPresets, isPasswordSet, setPassword, verifyPassword, removePassword, AVAILABLE_FONTS, loadFontNames, saveFontNames, loadFontHeaders, saveFontHeaders, loadFontItems, saveFontItems, loadFontTitles, saveFontTitles, getFontFamily, loadLanguage, saveLanguage } from '../utils/storage';
import { translations, oracleMessages } from '../utils/translations';

export default function CrushListScreen({ navigation }) {
  // Load font
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular,
    DancingScript_700Bold,
  });
  const [crushes, setCrushes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCrushName, setNewCrushName] = useState('');
  const [newCrushDescription, setNewCrushDescription] = useState('');
  const [cemeteryModalVisible, setCemeteryModalVisible] = useState(false);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  // Theme color management
  const [themeColor, setThemeColor] = useState('#FF6B9D');
  const [backgroundColor, setBackgroundColor] = useState('#FFF0F5');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [tempR, setTempR] = useState(255);
  const [tempG, setTempG] = useState(107);
  const [tempB, setTempB] = useState(157);
  const [colorPresets, setColorPresets] = useState([null, null]);
  const [editingColorType, setEditingColorType] = useState('header'); // 'header' or 'background'

  // Password management
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);

  // Font management
  const [fontPickerVisible, setFontPickerVisible] = useState(false);
  const [fontNames, setFontNames] = useState('DancingScript');
  const [fontHeaders, setFontHeaders] = useState('DancingScript');
  const [fontItems, setFontItems] = useState('System');
  const [fontTitles, setFontTitles] = useState('DancingScript');
  const [selectedFontCategory, setSelectedFontCategory] = useState('names'); // 'names', 'headers', 'items', or 'titles'
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Easter egg: Secret revival feature
  const [tapCount, setTapCount] = useState(0);
  const [revivalModalVisible, setRevivalModalVisible] = useState(false);
  const [revivalCount, setRevivalCount] = useState(0);

  // Easter egg: Relationship Oracle
  const [oracleModalVisible, setOracleModalVisible] = useState(false);
  const [oracleMessage, setOracleMessage] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOrder, setDragOrder] = useState([]);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Language management
  const [language, setLanguage] = useState('fr');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const t = translations[language];

  const scrollOffsetRef = useRef(0);
  const itemHeightRef = useRef(100); // Estimated, will be measured
  const dragStartIndexRef = useRef(null);
  const itemPositions = useRef({});

  useEffect(() => {
    loadData();
    loadRevivalCount();
  }, []);

  const loadRevivalCount = async () => {
    try {
      const count = await AsyncStorage.getItem('@revival_count');
      if (count) {
        setRevivalCount(parseInt(count));
      }
    } catch (error) {
      console.error('Error loading revival count:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  // Add settings icon to navigation header
  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: themeColor,
      },
      headerTitle: () => {
        const customFont = getFontFamily(fontHeaders);
        return (
          <TouchableOpacity onPress={handleHeaderTap}>
            <Text style={{
              fontSize: 18,
              color: '#fff',
              ...(customFont ? { fontFamily: customFont } : { fontWeight: 'bold' })
            }}>
              {t.appTitle}
            </Text>
          </TouchableOpacity>
        );
      },
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15, padding: 8 }}
          onPress={() => setSettingsModalVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontSize: 28, color: '#fff' }}>⋮</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, tapCount, themeColor, fontHeaders, t]);

  // Easter egg: Handle header tap for secret revival
  const handleHeaderTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount === 7) {
      setTapCount(0); // Reset counter
      if (destroyedCrushes.length > 0) {
        setRevivalModalVisible(true);
      } else {
        Alert.alert(t.secretDiscovered, t.noOneInCemetery);
      }
    }

    // Reset counter after 2 seconds of inactivity
    setTimeout(() => {
      setTapCount(0);
    }, 2000);
  };

  const loadData = async () => {
    const data = await loadCrushes();
    setCrushes(data);

    // Load theme color
    const color = await loadThemeColor();
    setThemeColor(color);

    // Load background color
    const bgColor = await loadBackgroundColor();
    setBackgroundColor(bgColor);

    // Parse RGB from current editing color (default to header)
    const currentColor = editingColorType === 'header' ? color : bgColor;
    const r = parseInt(currentColor.slice(1, 3), 16);
    const g = parseInt(currentColor.slice(3, 5), 16);
    const b = parseInt(currentColor.slice(5, 7), 16);
    setTempR(r);
    setTempG(g);
    setTempB(b);

    // Load color presets
    const presets = await loadColorPresets();
    setColorPresets(presets);

    // Check if password is set
    const passwordSet = await isPasswordSet();
    setHasPassword(passwordSet);

    // Load fonts
    const savedFontNames = await loadFontNames();
    setFontNames(savedFontNames);
    const savedFontHeaders = await loadFontHeaders();
    setFontHeaders(savedFontHeaders);
    const savedFontItems = await loadFontItems();
    setFontItems(savedFontItems);
    const savedFontTitles = await loadFontTitles();
    setFontTitles(savedFontTitles);

    // Load language
    const savedLanguage = await loadLanguage();
    setLanguage(savedLanguage);
  };

  const addCrush = async () => {
    const sanitizedName = sanitizeInput(newCrushName);
    const sanitizedDescription = sanitizeInput(newCrushDescription);

    if (sanitizedName === '') {
      Alert.alert(t.error, t.enterValidName);
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
        status: 'active', // active, ended, or standby
        createdAt: new Date().toISOString(),
      };

      const updatedCrushes = [...crushes, newCrush];
      setCrushes(updatedCrushes);
      await saveCrushes(updatedCrushes);

      setNewCrushName('');
      setNewCrushDescription('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert(t.error, t.unableToSave);
    }
  };

  const deleteCrush = async (id) => {
    Alert.alert(
      t.deleteCrush,
      t.confirmDeleteCrush,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
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
      t.clearAllData,
      t.confirmClearAll,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.clearAll,
          style: 'destructive',
          onPress: async () => {
            await clearAllCrushes();
            setCrushes([]);
          },
        },
      ]
    );
  };

  const openColorPicker = () => {
    setSettingsModalVisible(false);
    // Load the current editing color into sliders
    const currentColor = editingColorType === 'header' ? themeColor : backgroundColor;
    const r = parseInt(currentColor.slice(1, 3), 16);
    const g = parseInt(currentColor.slice(3, 5), 16);
    const b = parseInt(currentColor.slice(5, 7), 16);
    setTempR(r);
    setTempG(g);
    setTempB(b);
    setColorPickerVisible(true);
  };

  const saveColor = async () => {
    const r = Math.round(tempR).toString(16).padStart(2, '0');
    const g = Math.round(tempG).toString(16).padStart(2, '0');
    const b = Math.round(tempB).toString(16).padStart(2, '0');
    const newColor = `#${r}${g}${b}`;

    if (editingColorType === 'header') {
      setThemeColor(newColor);
      await saveThemeColor(newColor);
    } else {
      setBackgroundColor(newColor);
      await saveBackgroundColor(newColor);
    }
    setColorPickerVisible(false);
  };

  const switchEditingColor = (type) => {
    setEditingColorType(type);
    // Load the selected color into sliders
    const currentColor = type === 'header' ? themeColor : backgroundColor;
    const r = parseInt(currentColor.slice(1, 3), 16);
    const g = parseInt(currentColor.slice(3, 5), 16);
    const b = parseInt(currentColor.slice(5, 7), 16);
    setTempR(r);
    setTempG(g);
    setTempB(b);
  };

  // Password management functions
  const openPasswordModal = () => {
    setSettingsModalVisible(false);
    setPasswordModalVisible(true);
  };

  const handlePasswordSubmit = async () => {
    if (hasPassword) {
      // Changing password
      if (currentPassword === '') {
        Alert.alert(t.error, t.enterCurrentPassword);
        return;
      }

      const isValid = await verifyPassword(currentPassword);
      if (!isValid) {
        Alert.alert(t.error, t.incorrectCurrentPassword);
        return;
      }

      if (newPassword === '') {
        // Remove password
        Alert.alert(
          t.deletePassword,
          t.confirmDeletePassword,
          [
            { text: t.cancel, style: 'cancel' },
            {
              text: t.delete,
              style: 'destructive',
              onPress: async () => {
                await removePassword();
                setHasPassword(false);
                setCurrentPassword('');
                setPasswordModalVisible(false);
                Alert.alert(t.success, t.passwordDeleted);
              },
            },
          ]
        );
        return;
      }

      if (newPassword.length < 4) {
        Alert.alert(t.error, t.passwordMinChars);
        return;
      }

      if (newPassword !== confirmNewPassword) {
        Alert.alert(t.error, t.passwordsDontMatch);
        return;
      }

      await setPassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordModalVisible(false);
      Alert.alert(t.success, t.passwordChanged);
    } else {
      // Setting new password
      if (newPassword.length < 4) {
        Alert.alert(t.error, t.passwordMinCharsNew);
        return;
      }

      if (newPassword !== confirmNewPassword) {
        Alert.alert(t.error, t.passwordsDontMatch);
        return;
      }

      await setPassword(newPassword);
      setHasPassword(true);
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordModalVisible(false);
      Alert.alert(t.success, t.passwordCreated);
    }
  };

  // Font management functions
  const openFontPicker = () => {
    setSettingsModalVisible(false);
    setFontPickerVisible(true);
  };

  const selectFont = async (fontId, category) => {
    if (category === 'names') {
      setFontNames(fontId);
      await saveFontNames(fontId);
    } else if (category === 'headers') {
      setFontHeaders(fontId);
      await saveFontHeaders(fontId);
    } else if (category === 'items') {
      setFontItems(fontId);
      await saveFontItems(fontId);
    } else if (category === 'titles') {
      setFontTitles(fontId);
      await saveFontTitles(fontId);
    }
  };

  const resetFonts = async () => {
    setFontNames('DancingScript');
    setFontHeaders('DancingScript');
    setFontItems('System');
    setFontTitles('DancingScript');
    await saveFontNames('DancingScript');
    await saveFontHeaders('DancingScript');
    await saveFontItems('System');
    await saveFontTitles('DancingScript');
  };

  const resetColor = async () => {
    if (editingColorType === 'header') {
      const defaultColor = '#FF6B9D';
      setTempR(255);
      setTempG(107);
      setTempB(157);
      setThemeColor(defaultColor);
      await saveThemeColor(defaultColor);
    } else {
      const defaultBgColor = '#FFF0F5';
      const r = parseInt(defaultBgColor.slice(1, 3), 16);
      const g = parseInt(defaultBgColor.slice(3, 5), 16);
      const b = parseInt(defaultBgColor.slice(5, 7), 16);
      setTempR(r);
      setTempG(g);
      setTempB(b);
      setBackgroundColor(defaultBgColor);
      await saveBackgroundColor(defaultBgColor);
    }
    setColorPickerVisible(false);
  };

  const saveCurrentColorToPreset = async (slotIndex) => {
    const r = Math.round(tempR).toString(16).padStart(2, '0');
    const g = Math.round(tempG).toString(16).padStart(2, '0');
    const b = Math.round(tempB).toString(16).padStart(2, '0');
    const currentColor = `#${r}${g}${b}`;

    const newPresets = [...colorPresets];
    newPresets[slotIndex] = currentColor;
    setColorPresets(newPresets);
    await saveColorPresets(newPresets);
  };

  const loadPresetColor = (presetColor) => {
    if (!presetColor) return;

    const r = parseInt(presetColor.slice(1, 3), 16);
    const g = parseInt(presetColor.slice(3, 5), 16);
    const b = parseInt(presetColor.slice(5, 7), 16);
    setTempR(r);
    setTempG(g);
    setTempB(b);
  };

  // Easter egg: Relationship Oracle
  const openOracle = () => {
    if (crushes.length === 0) {
      Alert.alert(t.oracle, t.addCrushesFirst);
      return;
    }

    // Calculate stats
    const activeCount = activeCrushes.length;
    const archivedCount = archivedCrushes.length;
    const destroyedCount = destroyedCrushes.length;
    const total = crushes.length;

    // Calculate average feelings
    const crushesWithFeelings = crushes.filter(c => c.mistakes < 5);
    const avgFeelings = crushesWithFeelings.length > 0
      ? crushesWithFeelings.reduce((sum, c) => sum + (c.feelings ?? 50), 0) / crushesWithFeelings.length
      : 50;

    // Count qualities vs defects
    const totalQualities = crushes.reduce((sum, c) => sum + (c.qualities?.length || 0), 0);
    const totalDefects = crushes.reduce((sum, c) => sum + (c.defects?.length || 0), 0);

    // Count good vs bad actions
    const totalGoodActions = crushes.reduce((sum, c) => sum + (c.pros?.length || 0), 0);
    const totalBadActions = crushes.reduce((sum, c) => sum + (c.cons?.length || 0), 0);

    // Cemetery rate
    const cemeteryRate = destroyedCount > 0 ? Math.round((destroyedCount / total) * 100) : 0;

    const om = oracleMessages[language];

    // Generate messages based on stats
    const messages = [
      // Feelings-based
      avgFeelings > 70 ? om.highFeelings : null,
      avgFeelings < 30 ? om.lowFeelings : null,
      avgFeelings >= 80 ? om.veryHighFeelings : null,
      avgFeelings >= 50 && avgFeelings <= 55 ? om.neutralFeelings : null,
      avgFeelings < 40 && total >= 3 ? om.lowFeelingsMultiple : null,

      // Qualities vs Defects
      totalQualities > totalDefects * 2 ? om.moreQualities : null,
      totalDefects > totalQualities * 2 ? om.moreDefects : null,
      totalQualities === totalDefects && totalQualities > 0 ? om.balancedTraits : null,
      totalQualities === 0 && totalDefects === 0 && total >= 2 ? om.noTraits : null,
      totalQualities > 20 ? om.manyQualities : null,
      totalDefects > 20 ? om.manyDefects : null,
      totalQualities > 0 && totalDefects === 0 ? om.onlyQualities : null,
      totalDefects > 0 && totalQualities === 0 ? om.onlyDefects : null,

      // Cemetery stats
      destroyedCount === 0 && total >= 3 ? om.noCemetery : null,
      destroyedCount >= 3 ? `${destroyedCount} ${om.manyCemetery}` : null,
      cemeteryRate >= 50 && total >= 4 ? `${cemeteryRate}% ${om.highCemeteryRate}` : null,
      destroyedCount === 1 && total > 5 ? om.oneCemetery : null,
      destroyedCount >= 5 ? `${destroyedCount} ${om.massiveCemetery}` : null,
      destroyedCount === total && total >= 2 ? om.allCemetery : null,

      // Active vs Archived
      archivedCount > activeCount && archivedCount >= 2 ? om.moreArchived : null,
      activeCount >= 5 ? om.manyActive : null,
      activeCount === 0 && archivedCount > 0 ? om.noActive : null,
      activeCount === 1 && total >= 5 ? om.onlyOneActive : null,
      archivedCount >= 5 ? `${archivedCount} ${om.manyArchived}` : null,
      activeCount === total && total >= 3 ? om.allActive : null,

      // Actions
      totalGoodActions > totalBadActions * 3 ? om.manyGoodActions : null,
      totalBadActions > totalGoodActions * 2 ? om.manyBadActions : null,
      totalGoodActions === 0 && totalBadActions > 0 ? om.noGoodActions : null,
      totalBadActions === 0 && totalGoodActions > 0 ? om.noBadActions : null,
      totalGoodActions > 30 ? om.lotsOfGoodActions : null,
      totalBadActions > 30 ? om.lotsOfBadActions : null,
      totalGoodActions === totalBadActions && totalGoodActions > 0 ? om.balancedActions : null,

      // Total count
      total === 1 ? om.oneCrush : null,
      total === 2 ? om.twoCrushes : null,
      total === 3 ? om.threeCrushes : null,
      total >= 10 ? `${total} ${om.manyCrushes}` : null,
      total >= 15 ? `${total} ${om.lotsCrushes}` : null,
      total >= 20 ? `${total} ${om.tooManyCrushes}` : null,

      // Detailed knowledge
      crushes.some(c => (c.qualities?.length || 0) + (c.defects?.length || 0) >= 10) ? om.knowSomeoneWell : null,
      crushes.some(c => (c.qualities?.length || 0) + (c.defects?.length || 0) >= 15) ? om.knowSomeoneVeryWell : null,
      crushes.some(c => (c.pros?.length || 0) + (c.cons?.length || 0) >= 20) ? om.manyActionsOnSomeone : null,
      crushes.every(c => (c.pros?.length || 0) + (c.cons?.length || 0) < 2) ? om.fewActions : null,

      // Feelings patterns
      crushes.every(c => (c.feelings ?? 50) > 60) ? om.allHighFeelings : null,
      crushes.every(c => (c.feelings ?? 50) < 40) ? om.allLowFeelings : null,
      crushes.some(c => (c.feelings ?? 50) === 100) ? om.someone100 : null,
      crushes.some(c => (c.feelings ?? 50) === 0) ? om.someone0 : null,
      crushes.filter(c => (c.feelings ?? 50) >= 80).length >= 3 ? om.manyHigh : null,

      // Mixed stats
      activeCount >= 3 && destroyedCount === 0 ? om.activeNoFails : null,
      archivedCount === 0 && destroyedCount === 0 && total >= 4 ? om.masterOfGame : null,
      totalGoodActions > 0 && totalBadActions === 0 && total >= 2 ? om.onlyGoodVibes : null,
      cemeteryRate < 20 && total >= 5 ? om.lowFailRate : null,
      avgFeelings > 65 && destroyedCount <= 1 ? om.lucky : null,

      // Funny observations
      crushes.some(c => c.description && c.description.length > 200) ? om.longDescription : null,
      crushes.filter(c => c.mistakes >= 3).length >= 2 ? om.dangerZone : null,
      crushes.every(c => c.name.length < 5) && total >= 2 ? om.shortNames : null,
      total >= 3 && totalGoodActions + totalBadActions < 5 ? om.observer : null,
    ].filter(Boolean);

    // Pick a random message or default
    const selectedMessage = messages.length > 0
      ? messages[Math.floor(Math.random() * messages.length)]
      : t.starsAligned;

    setOracleMessage(selectedMessage);
    setOracleModalVisible(true);
  };

  // Easter egg: Revive a crush from cemetery
  const reviveCrush = async (crushId) => {
    setRevivalModalVisible(false);

    // Check if max revivals reached
    if (revivalCount >= 2) {
      Alert.alert('😱', t.cantLetYouDoThis);
      return;
    }

    // Show warning alert
    Alert.alert('⚠️', t.notAGoodIdea, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.continueAnyway,
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedCrushes = crushes.map(c =>
              c.id === crushId ? { ...c, mistakes: 0 } : c
            );
            await saveCrushes(updatedCrushes);
            setCrushes(updatedCrushes);

            // Increment revival count
            const newCount = revivalCount + 1;
            setRevivalCount(newCount);
            await AsyncStorage.setItem('@revival_count', newCount.toString());

            Alert.alert('🎉', t.revivalSuccess);
          } catch (error) {
            Alert.alert(t.error, t.unableToRevive);
          }
        },
      },
    ]);
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

  // Separate crushes by status
  const activeCrushes = crushes.filter(c => c.mistakes < 5 && (!c.status || c.status === 'active'));
  const archivedCrushes = crushes.filter(c => c.mistakes < 5 && (c.status === 'ended' || c.status === 'standby'));
  const destroyedCrushes = crushes.filter(c => c.mistakes >= 5);

  const renderCrush = ({ item }) => {
    const livesLeft = 5 - item.mistakes;

    return (
      <TouchableOpacity
        style={styles.crushCard}
        onPress={() => navigation.navigate('CrushDetail', { crushId: item.id, language })}
        onLongPress={() => deleteCrush(item.id)}
      >
        <View style={styles.crushCardContent}>
          <Text style={[styles.crushName, getFontFamily(fontNames) && { fontFamily: getFontFamily(fontNames) }]}>{item.name}</Text>
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
          navigation.navigate('CrushDetail', { crushId: item.id, language });
        }}
      >
        <Text style={styles.cemeteryName}>☠️ {item.name}</Text>
        <Text style={styles.cemeteryDate}>
          {new Date(item.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderArchivedCrush = ({ item }) => {
    const statusIcon = item.status === 'ended' ? '💔' : '⏸️';
    const statusText = item.status === 'ended' ? t.ended : t.onHold;

    return (
      <TouchableOpacity
        style={styles.archiveItem}
        onPress={() => {
          setArchiveModalVisible(false);
          navigation.navigate('CrushDetail', { crushId: item.id, language });
        }}
      >
        <View style={styles.archiveItemContent}>
          <Text style={styles.archiveName}>{statusIcon} {item.name}</Text>
          <Text style={styles.archiveStatus}>{statusText}</Text>
        </View>
        <Text style={styles.archiveDate}>
          {new Date(item.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
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
    <View style={[styles.container, { backgroundColor }]}>
      {/* Reorder Mode Banner */}
      {reorderMode && (
        <View style={styles.reorderBanner}>
          <Text style={styles.reorderBannerText}>{t.holdAndDragToReorder}</Text>
          <TouchableOpacity onPress={toggleReorderMode}>
            <Text style={styles.reorderBannerButton}>{t.finish}</Text>
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
              <Text style={styles.emptyText}>{t.noCrushYet}</Text>
              <Text style={styles.emptySubtext}>{t.useNavBar}</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: themeColor }]}
        onPress={() => setModalVisible(true)}
        onLongPress={openOracle}
        testID="open-add-modal-button"
        accessibilityLabel="Ouvrir le formulaire d'ajout"
        delayLongPress={2000}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.addNewCrush}</Text>

            <TextInput
              style={styles.input}
              placeholder={t.name}
              value={newCrushName}
              onChangeText={setNewCrushName}
              autoFocus
              maxLength={50}
            />

            <TextInput
              style={styles.inputDescription}
              placeholder={t.descriptionOptional}
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
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addCrush}
                testID="modal-add-crush-button"
                accessibilityLabel={t.add}
              >
                <Text style={styles.confirmButtonText}>{t.add}</Text>
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
            <Text style={styles.modalTitle}>{t.cemeteryTitle}</Text>

            <FlatList
              data={destroyedCrushes}
              renderItem={renderDestroyedCrush}
              keyExtractor={item => item.id}
              style={styles.cemeteryList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t.noCrushGameOver}</Text>
                </View>
              }
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, styles.closeCemeteryButton]}
              onPress={() => setCemeteryModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Archive Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={archiveModalVisible}
        onRequestClose={() => setArchiveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.archiveModal]}>
            <Text style={styles.modalTitle}>{t.archiveTitle}</Text>

            <FlatList
              data={archivedCrushes}
              renderItem={renderArchivedCrush}
              keyExtractor={item => item.id}
              style={styles.archiveList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t.noArchivedRelation}</Text>
                </View>
              }
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, styles.closeCemeteryButton]}
              onPress={() => setArchiveModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>{t.close}</Text>
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
            <ScrollView showsVerticalScrollIndicator={true} style={styles.settingsScrollView}>
              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setCemeteryModalVisible(true);
                }}
              >
                <Text style={styles.settingsOptionIcon}>🪦</Text>
                <View style={styles.settingsOptionTextContainer}>
                  <Text style={styles.settingsOptionTitle}>{t.cemetery}</Text>
                  {destroyedCrushes.length > 0 && (
                    <Text style={styles.settingsOptionSubtitle}>{destroyedCrushes.length} {destroyedCrushes.length > 1 ? t.crushesGameOver : t.crushGameOver}</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setArchiveModalVisible(true);
                }}
              >
                <Text style={styles.settingsOptionIcon}>📁</Text>
                <View style={styles.settingsOptionTextContainer}>
                  <Text style={styles.settingsOptionTitle}>{t.archive}</Text>
                  {archivedCrushes.length > 0 && (
                    <Text style={styles.settingsOptionSubtitle}>{archivedCrushes.length} {archivedCrushes.length > 1 ? t.archivedRelations : t.archivedRelation}</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={toggleReorderMode}
              >
                <Text style={styles.settingsOptionIcon}>↕️</Text>
                <View style={styles.settingsOptionTextContainer}>
                  <Text style={styles.settingsOptionTitle}>{t.reorder}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={openColorPicker}
              >
                <Text style={styles.settingsOptionIcon}>🎨</Text>
                <View style={styles.settingsOptionTextContainer}>
                  <Text style={styles.settingsOptionTitle}>{t.color}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={openFontPicker}
              >
                <Text style={styles.settingsOptionIcon}>🔤</Text>
                <View style={styles.settingsOptionTextContainer}>
                  <Text style={styles.settingsOptionTitle}>{t.fonts}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setLanguageModalVisible(true);
                }}
              >
                <Text style={styles.settingsOptionIcon}>🌐</Text>
                <View style={styles.settingsOptionTextContainer}>
                  <Text style={styles.settingsOptionTitle}>{t.language}</Text>
                  <Text style={styles.settingsOptionSubtitle}>{language === 'fr' ? 'Français' : 'English'}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={openPasswordModal}
              >
                <Text style={styles.settingsOptionIcon}>🔒</Text>
                <View style={styles.settingsOptionTextContainer}>
                  <Text style={styles.settingsOptionTitle}>{t.password}</Text>
                  {hasPassword && (
                    <Text style={styles.settingsOptionSubtitle}>{t.protectionEnabled}</Text>
                  )}
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
                  <Text style={[styles.settingsOptionTitle, styles.dangerText]}>{t.clear}</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <Text style={styles.scrollIndicator}>▼</Text>

            <TouchableOpacity
              style={styles.settingsCloseButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.settingsCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Easter Egg: Secret Revival Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={revivalModalVisible}
        onRequestClose={() => setRevivalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.revivalModal]}>
            <Text style={styles.modalTitle}>{t.secretRevival}</Text>
            <Text style={styles.revivalSubtitle}>
              {revivalCount < 2
                ? `${2 - revivalCount} ${2 - revivalCount > 1 ? t.revivalsRemainingPlural : t.revivalsRemaining}`
                : t.noMoreRevivals}
            </Text>

            <FlatList
              data={destroyedCrushes}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.revivalItem}
                  onPress={() => reviveCrush(item.id)}
                  disabled={revivalCount >= 2}
                >
                  <Text style={styles.revivalName}>☠️ {item.name}</Text>
                  <Text style={styles.revivalDate}>
                    {new Date(item.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id}
              style={styles.revivalList}
            />

            <TouchableOpacity
              style={styles.settingsCloseButton}
              onPress={() => setRevivalModalVisible(false)}
            >
              <Text style={styles.settingsCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Easter Egg: Relationship Oracle */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={oracleModalVisible}
        onRequestClose={() => setOracleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.oracleModalContent}>
            <Text style={styles.oracleIcon}>🔮</Text>
            <Text style={styles.oracleTitle}>{t.relationshipOracle}</Text>
            <View style={styles.oracleMessageContainer}>
              <Text style={styles.oracleMessage}>{oracleMessage}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsCloseButton}
              onPress={() => setOracleModalVisible(false)}
            >
              <Text style={styles.settingsCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={colorPickerVisible}
        onRequestClose={() => setColorPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.colorPickerModal}>
            <Text style={styles.modalTitle}>{t.chooseColor}</Text>

            <View style={styles.colorPreviewContainer}>
              <View style={[
                styles.colorPreview,
                { backgroundColor: `rgb(${Math.round(tempR)}, ${Math.round(tempG)}, ${Math.round(tempB)})` }
              ]} />
            </View>

            {/* Color Presets */}
            <View style={styles.presetsSection}>
              <Text style={styles.presetsTitle}>{t.presets}</Text>
              <View style={styles.presetsContainer}>
                {[0, 1].map((index) => (
                  <View key={index} style={styles.presetSlot}>
                    <TouchableOpacity
                      style={[
                        styles.presetCircle,
                        { backgroundColor: colorPresets[index] || '#E0E0E0' }
                      ]}
                      onPress={() => loadPresetColor(colorPresets[index])}
                      onLongPress={() => saveCurrentColorToPreset(index)}
                      delayLongPress={500}
                    >
                      {!colorPresets[index] && (
                        <Text style={styles.emptyPresetText}>+</Text>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.presetLabel}>{t.slot} {index + 1}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.presetsHint}>{t.longPressToSave}</Text>
            </View>

            {/* Color Type Selection */}
            <View style={styles.colorTypeSection}>
              <Text style={styles.colorTypeTitle}>{t.colorToModify}</Text>
              <View style={styles.colorTypeOptions}>
                <TouchableOpacity
                  style={styles.colorTypeOption}
                  onPress={() => switchEditingColor('header')}
                >
                  <View style={[
                    styles.checkbox,
                    editingColorType === 'header' && styles.checkboxChecked
                  ]}>
                    {editingColorType === 'header' && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.colorTypeLabel}>{t.header}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.colorTypeOption}
                  onPress={() => switchEditingColor('background')}
                >
                  <View style={[
                    styles.checkbox,
                    editingColorType === 'background' && styles.checkboxChecked
                  ]}>
                    {editingColorType === 'background' && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.colorTypeLabel}>{t.background}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>{t.red}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  value={tempR}
                  onValueChange={setTempR}
                  minimumTrackTintColor="#FF0000"
                  maximumTrackTintColor="#DDD"
                />
                <Text style={styles.sliderValue}>{Math.round(tempR)}</Text>
              </View>

              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>{t.green}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  value={tempG}
                  onValueChange={setTempG}
                  minimumTrackTintColor="#00FF00"
                  maximumTrackTintColor="#DDD"
                />
                <Text style={styles.sliderValue}>{Math.round(tempG)}</Text>
              </View>

              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>{t.blue}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  value={tempB}
                  onValueChange={setTempB}
                  minimumTrackTintColor="#0000FF"
                  maximumTrackTintColor="#DDD"
                />
                <Text style={styles.sliderValue}>{Math.round(tempB)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetColor}
            >
              <Text style={styles.resetButtonText}>{t.resetToDefault}</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setColorPickerVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveColor}
              >
                <Text style={styles.confirmButtonText}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {hasPassword ? t.managePassword : t.createPassword}
            </Text>

            {hasPassword && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t.currentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.passwordHint}>
                  {t.leaveEmptyToRemove}
                </Text>
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder={t.newPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder={t.confirmNewPassword}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: themeColor }]}
                onPress={handlePasswordSubmit}
              >
                <Text style={styles.confirmButtonText}>
                  {hasPassword ? t.modify : t.create}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Font Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={fontPickerVisible}
        onRequestClose={() => setFontPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.chooseFonts}</Text>

            {/* Category Selection Dropdown */}
            <View style={styles.fontCategorySection}>
              <Text style={styles.fontCategoryTitle}>{t.category}</Text>

              <TouchableOpacity
                style={styles.categoryDropdown}
                onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              >
                <Text style={styles.categoryDropdownText}>
                  {selectedFontCategory === 'names' && t.names}
                  {selectedFontCategory === 'headers' && t.headers}
                  {selectedFontCategory === 'items' && t.items}
                  {selectedFontCategory === 'titles' && t.titles}
                </Text>
                <Text style={styles.categoryDropdownIcon}>{categoryDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {categoryDropdownOpen && (
                <View style={styles.categoryDropdownMenu}>
                  <TouchableOpacity
                    style={[styles.categoryDropdownItem, selectedFontCategory === 'names' && { backgroundColor: `${themeColor}20` }]}
                    onPress={() => {
                      setSelectedFontCategory('names');
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.categoryDropdownItemText, selectedFontCategory === 'names' && { color: themeColor, fontWeight: 'bold' }]}>
                      {t.names}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.categoryDropdownItem, selectedFontCategory === 'headers' && { backgroundColor: `${themeColor}20` }]}
                    onPress={() => {
                      setSelectedFontCategory('headers');
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.categoryDropdownItemText, selectedFontCategory === 'headers' && { color: themeColor, fontWeight: 'bold' }]}>
                      {t.headers}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.categoryDropdownItem, selectedFontCategory === 'items' && { backgroundColor: `${themeColor}20` }]}
                    onPress={() => {
                      setSelectedFontCategory('items');
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.categoryDropdownItemText, selectedFontCategory === 'items' && { color: themeColor, fontWeight: 'bold' }]}>
                      {t.items}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.categoryDropdownItem, selectedFontCategory === 'titles' && { backgroundColor: `${themeColor}20` }]}
                    onPress={() => {
                      setSelectedFontCategory('titles');
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.categoryDropdownItemText, selectedFontCategory === 'titles' && { color: themeColor, fontWeight: 'bold' }]}>
                      {t.titles}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Font List */}
            <ScrollView style={styles.fontList}>
              {AVAILABLE_FONTS.map((font) => {
                const isSelected =
                  (selectedFontCategory === 'names' && fontNames === font.id) ||
                  (selectedFontCategory === 'headers' && fontHeaders === font.id) ||
                  (selectedFontCategory === 'items' && fontItems === font.id) ||
                  (selectedFontCategory === 'titles' && fontTitles === font.id);

                return (
                  <TouchableOpacity
                    key={font.id}
                    style={[
                      styles.fontOption,
                      isSelected && { backgroundColor: `${themeColor}20` }
                    ]}
                    onPress={() => selectFont(font.id, selectedFontCategory)}
                  >
                    <Text style={[
                      styles.fontOptionText,
                      font.family && { fontFamily: font.family }
                    ]}>
                      {font.name}
                    </Text>
                    {isSelected && (
                      <Text style={[styles.fontSelectedIcon, { color: themeColor }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Reset and Close Buttons */}
            <View style={styles.fontModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={resetFonts}
              >
                <Text style={styles.cancelButtonText}>{t.reset}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: themeColor }]}
                onPress={() => setFontPickerVisible(false)}
              >
                <Text style={styles.confirmButtonText}>{t.close}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <Text style={styles.modalTitle}>{t.chooseLanguage}</Text>

            <TouchableOpacity
              style={[styles.settingsOption, language === 'fr' && { backgroundColor: `${themeColor}15` }]}
              onPress={async () => {
                setLanguage('fr');
                await saveLanguage('fr');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={styles.settingsOptionIcon}>🇫🇷</Text>
              <View style={styles.settingsOptionTextContainer}>
                <Text style={styles.settingsOptionTitle}>{t.french}</Text>
              </View>
              {language === 'fr' && (
                <Text style={[styles.fontSelectedIcon, { color: themeColor }]}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsOption, language === 'en' && { backgroundColor: `${themeColor}15` }]}
              onPress={async () => {
                setLanguage('en');
                await saveLanguage('en');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={styles.settingsOptionIcon}>🇬🇧</Text>
              <View style={styles.settingsOptionTextContainer}>
                <Text style={styles.settingsOptionTitle}>{t.english}</Text>
              </View>
              {language === 'en' && (
                <Text style={[styles.fontSelectedIcon, { color: themeColor }]}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.settingsCloseButtonText}>✕</Text>
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
    paddingBottom: 100,
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
    fontSize: 24,
    fontFamily: 'DancingScript_700Bold',
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
    maxHeight: '80%',
  },
  settingsScrollView: {
    flexGrow: 0,
  },
  scrollIndicator: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    marginBottom: 4,
  },
  settingsCloseButton: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#F5F5F5',
  },
  settingsCloseButtonText: {
    fontSize: 22,
    color: '#333',
    fontWeight: '300',
    lineHeight: 22,
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
  },
  settingsOptionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  passwordHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic',
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
  archiveModal: {
    height: '70%',
    maxHeight: 500,
  },
  archiveList: {
    flex: 1,
    width: '100%',
    marginVertical: 10,
  },
  archiveItem: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  archiveItemContent: {
    flex: 1,
  },
  archiveName: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  archiveStatus: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  archiveDate: {
    fontSize: 14,
    color: '#999',
    marginLeft: 12,
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
    shadowRadius: 5,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 40,
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
    fontSize: 20,
    fontFamily: 'DancingScript_700Bold',
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
  revivalModal: {
    height: '70%',
    maxHeight: 500,
  },
  revivalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  revivalList: {
    flex: 1,
    width: '100%',
    marginVertical: 10,
  },
  revivalItem: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#8B0000',
  },
  revivalName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  revivalDate: {
    fontSize: 14,
    color: '#999',
  },
  oracleModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  oracleIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  oracleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B0082',
    marginBottom: 24,
    textAlign: 'center',
  },
  oracleMessageContainer: {
    backgroundColor: '#F8F5FF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E6D9FF',
    minHeight: 100,
    justifyContent: 'center',
  },
  oracleMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  // Color picker styles
  colorPickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  colorPreviewContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  colorPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#DDD',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    width: 60,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
  },
  sliderValue: {
    width: 40,
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Presets styles
  presetsSection: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  presetsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 8,
  },
  presetSlot: {
    alignItems: 'center',
  },
  presetCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyPresetText: {
    fontSize: 32,
    color: '#999',
    fontWeight: '300',
  },
  presetLabel: {
    fontSize: 12,
    color: '#666',
  },
  presetsHint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Color type selection styles
  colorTypeSection: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  colorTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  colorTypeOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  colorTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorTypeLabel: {
    fontSize: 15,
    color: '#333',
  },
  fontCategorySection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  fontCategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  categoryDropdownText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryDropdownIcon: {
    fontSize: 12,
    color: '#666',
  },
  categoryDropdownMenu: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    overflow: 'hidden',
  },
  categoryDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  categoryDropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  fontList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  fontOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  fontOptionText: {
    fontSize: 18,
    color: '#333',
  },
  fontSelectedIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fontModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
