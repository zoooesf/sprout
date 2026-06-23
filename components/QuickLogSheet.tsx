/**
 * QuickLogSheet — bottom sheet with category picker + contextual log form.
 * Matches the design's QuickLogPicker → QuickLogForm flow.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback,
  ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Animated, Easing,
  Image, ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { launchScanner, dismissScanner, onModernBarcodeScanned } from 'expo-camera';
import { colors, typography, spacing, categories, type CategoryKey } from '@/lib/tokens';
import { CategoryIcon } from './icons/CategoryIcon';
import { SoftButton } from './SoftButton';
import { ScoreDot } from './ScoreDot';
import { useCreateLogEntry, useUpdateLogEntry, useLibraryItems, useLastEntry, useFamilyLibraryItems, useCreateLibraryItem } from '@/hooks/useLogEntries';
import { lookupBarcode } from '@/lib/openFoodFacts';
import { fetchCurrentWeather } from '@/lib/weather';
import { uploadPhoto } from '@/lib/storage';
import type { LogEntry } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { router } from 'expo-router';
import { scoreWord } from '@/lib/tokens';

interface QuickLogSheetProps {
  onClose: () => void;
  editEntry?: LogEntry;
}

const LOG_CATEGORIES: { key: CategoryKey; sub: string }[] = [
  { key: 'checkin', sub: "Today's feel" },
  { key: 'food',   sub: 'Meal or Drink' },
  { key: 'cream',  sub: 'Lotion or Balm' },
  { key: 'medication', sub: 'Medication' },
  { key: 'sleep',  sub: 'Naps & Nights' },
  { key: 'photo',  sub: 'Add a snap' },
  { key: 'note',   sub: 'Quick thought' },
];

export function QuickLogSheet({ onClose: externalClose, editEntry }: QuickLogSheetProps) {
  const [selectedCat, setSelectedCat] = useState<CategoryKey | null>(
    editEntry ? editEntry.type as CategoryKey : null
  );

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
    }).start();
  }, []);

  const close = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 220,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start(() => externalClose());
  }, [externalClose]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          style={styles.kavContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.handle} />
            {!selectedCat ? (
              <CategoryPicker onPick={setSelectedCat} />
            ) : (
              <LogForm
                cat={selectedCat}
                onBack={editEntry ? close : () => setSelectedCat(null)}
                onClose={close}
                editEntry={editEntry}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CategoryPicker({ onPick }: { onPick: (cat: CategoryKey) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.pickerTitle}>Add entry</Text>
      <Text style={styles.pickerSub}>What happened?</Text>
      <View style={styles.pickerGrid}>
        {LOG_CATEGORIES.map(({ key, sub }) => {
          const meta = categories[key];
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onPick(key)}
              activeOpacity={0.7}
              style={styles.pickerItem}
            >
              <View style={[styles.pickerIconWrap, { backgroundColor: meta.tint }]}>
                <CategoryIcon name={meta.icon} size={22} color={meta.ink} />
              </View>
              <View>
                <Text style={styles.pickerLabel}>{meta.label}</Text>
                <Text style={styles.pickerItemSub}>{sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

type ActivePicker = 'date' | 'time' | null;

function DateTimeRow({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const formattedDate = value.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedTime = value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const openAndroid = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: false,
      onChange: (_event: any, selected?: Date) => {
        if (selected) onChange(selected);
      },
    });
  };

  const handleDatePill = () => {
    if (Platform.OS === 'android') {
      openAndroid('date');
    } else {
      setActivePicker((p) => (p === 'date' ? null : 'date'));
    }
  };

  const handleTimePill = () => {
    if (Platform.OS === 'android') {
      openAndroid('time');
    } else {
      setActivePicker((p) => (p === 'time' ? null : 'time'));
    }
  };

  return (
    <View style={dtStyles.wrapper}>
      <View style={dtStyles.row}>
        <CategoryIcon name="calendar" size={15} color={colors.muted} />
        <TouchableOpacity
          onPress={handleDatePill}
          style={[dtStyles.pill, activePicker === 'date' && dtStyles.pillActive]}
        >
          <Text style={[dtStyles.pillText, activePicker === 'date' && dtStyles.pillTextActive]}>
            {formattedDate}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleTimePill}
          style={[dtStyles.pill, activePicker === 'time' && dtStyles.pillActive]}
        >
          <Text style={[dtStyles.pillText, activePicker === 'time' && dtStyles.pillTextActive]}>
            {formattedTime}
          </Text>
        </TouchableOpacity>
      </View>
      {Platform.OS === 'ios' && activePicker !== null && (
        <DateTimePicker
          value={value}
          mode={activePicker}
          display="spinner"
          onChange={(_event: any, selected?: Date) => { if (selected) onChange(selected); }}
          style={dtStyles.iosPicker}
          textColor={colors.ink}
        />
      )}
    </View>
  );
}

function LogForm({ cat, onBack, onClose, editEntry }: { cat: CategoryKey; onBack: () => void; onClose: () => void; editEntry?: LogEntry }) {
  const meta = categories[cat];
  const activeSubject = useAuthStore((s) => s.activeSubject);
  const createEntry = useCreateLogEntry();
  const updateEntry = useUpdateLogEntry();
  const isEditing = !!editEntry;

  const p = (editEntry?.payload ?? {}) as Record<string, any>;

  const [entryTimestamp, setEntryTimestamp] = useState<Date>(
    () => editEntry ? new Date(editEntry.timestamp) : new Date()
  );

  const [noteText, setNoteText] = useState(() => cat === 'note' ? (p.text ?? '') : cat === 'photo' ? (p.caption ?? '') : '');
  const [foodName, setFoodName] = useState(() => p.name ?? '');
  const [foodIngredients, setFoodIngredients] = useState(() => Array.isArray(p.ingredients) ? p.ingredients.join(', ') : '');
  const [checkInScore, setCheckInScore] = useState<number>(() => p.severity_score ?? 5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(() => p.symptoms ?? []);
  const [sleepHours, setSleepHours] = useState(() => p.hours != null ? String(p.hours) : '');
  const [sleepQuality, setSleepQuality] = useState<number>(() => p.quality ?? 3);
  const [sleepNotes, setSleepNotes] = useState(() => p.notes ?? '');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(() => p.library_item_id ?? null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(() => p.areas ?? []);
  const [dose, setDose] = useState(() => p.dose ?? '');
  const [photoSeverity, setPhotoSeverity] = useState<number>(() => p.severity as number ?? 3);

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(
    () => editEntry?.photo_urls?.[0] ?? null
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Barcode scanner state
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scannedItems, setScannedItems] = useState<{ name: string; ingredients: string[] }[]>([]);

  const { data: libraryItems = [] } = useLibraryItems(
    cat === 'medication' ? 'medication' : cat === 'cream' ? 'cream' : undefined
  );

  const { data: lastMedEntry } = useLastEntry(
    (cat === 'medication' || cat === 'cream') ? cat as 'medication' | 'cream' : 'medication'
  );
  const { data: savedFoods = [], error: foodsError } = useFamilyLibraryItems('food');
  const { data: savedRecipes = [], error: recipesError } = useFamilyLibraryItems('recipe');
  const createLibraryItem = useCreateLibraryItem();

  const SYMPTOMS = ['Itchy', 'Red patches', 'Dry skin', 'Scratching', 'Cracked', 'Weeping', 'Sleep disrupted', 'Calm', 'Hot to touch'];
  const BODY_AREAS = ['Cheeks', 'Eyes', 'Elbows', 'Knees', 'Neck', 'Belly', 'Back', 'Arms', 'Legs', 'Hands', 'Feet'];

  const toggleSymptom = (s: string) =>
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleArea = (a: string) =>
    setSelectedAreas((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handleRepeatLastDose = () => {
    if (!lastMedEntry) return;
    const lp = lastMedEntry.payload as Record<string, any>;
    if (lp.library_item_id) setSelectedLibraryId(lp.library_item_id);
    if (lp.dose) setDose(lp.dose);
    if (lp.areas) setSelectedAreas(lp.areas);
  };

  const openScanner = async () => {
    const subscription = onModernBarcodeScanned(async ({ data }) => {
      subscription.remove();
      if (Platform.OS === 'ios') dismissScanner();
      await handleBarcodeScan(data);
    });
    await launchScanner({
      barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
    });
  };

  const handleBarcodeScan = async (barcode: string) => {
    setBarcodeLoading(true);
    const product = await lookupBarcode(barcode);
    setBarcodeLoading(false);
    if (!product) {
      Alert.alert('Not found', 'Could not find this product in Open Food Facts. You can fill in the details manually.');
      return;
    }
    if (product.name) {
      const newItem = { name: product.name, ingredients: product.ingredients };
      setScannedItems((prev) => {
        const updated = [...prev, newItem];
        // Merge all ingredients from all scanned items into the text field
        const allIngredients = updated.flatMap((i) => i.ingredients);
        const unique = Array.from(new Set(allIngredients));
        setFoodIngredients(unique.join(', '));
        return updated;
      });
    }
    // Auto-save to food library if not already saved
    const alreadySaved = savedFoods.some((f) => f.barcode === barcode || f.name === product.name);
    if (!alreadySaved && product.name) {
      createLibraryItem.mutate({
        type: 'food',
        name: product.name,
        ingredients: product.ingredients,
        barcode,
      });
    }
  };

  const removeScannedItem = (index: number) => {
    setScannedItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const allIngredients = updated.flatMap((i) => i.ingredients);
      const unique = Array.from(new Set(allIngredients));
      setFoodIngredients(unique.join(', '));
      return updated;
    });
  };

  const pickPhoto = () => {
    Alert.alert('Add photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    try {
      let payload: Record<string, unknown> = {};
      let photoUrls: string[] = editEntry?.photo_urls ?? [];

      switch (cat) {
        case 'note':
          if (!noteText.trim()) { Alert.alert('Note required'); return; }
          payload = { text: noteText.trim() };
          break;
        case 'food':
          if (!foodName.trim()) { Alert.alert('Food name required'); return; }
          payload = {
            name: foodName.trim(),
            ingredients: foodIngredients.split(',').map((s) => s.trim()).filter(Boolean),
            ...(scannedItems.length > 0 && { scanned_items: scannedItems }),
          };
          break;
        case 'checkin':
          payload = { severity_score: checkInScore, symptoms: selectedSymptoms };
          break;
        case 'sleep':
          payload = { hours: parseFloat(sleepHours) || null, quality: sleepQuality, notes: sleepNotes.trim() || null };
          break;
        case 'medication':
        case 'cream': {
          const item = libraryItems.find((i) => i.id === selectedLibraryId);
          if (!item) { Alert.alert('Please select an item from your library or add a new one.'); return; }
          payload = {
            library_item_id: item.id,
            library_item_name: item.name,
            areas: selectedAreas,
            dose: dose.trim() || item.default_dose || null,
          };
          break;
        }
        case 'photo': {
          if (photoUri && photoUri.startsWith('file://') && activeSubject) {
            setUploadingPhoto(true);
            try {
              const url = await uploadPhoto(activeSubject.id, photoUri);
              photoUrls = [url];
            } finally {
              setUploadingPhoto(false);
            }
          }
          payload = { areas: selectedAreas, caption: noteText.trim() || null, severity: photoSeverity };
          break;
        }
      }

      // Fetch weather silently on new entries (non-blocking)
      const weather = isEditing ? undefined : await fetchCurrentWeather();

      if (isEditing) {
        await updateEntry.mutateAsync({ id: editEntry!.id, payload, timestamp: entryTimestamp.toISOString() });
      } else {
        await createEntry.mutateAsync({
          type: cat,
          payload,
          photo_urls: photoUrls,
          timestamp: entryTimestamp.toISOString(),
          weather,
        });
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Error saving entry', e?.message ?? 'Unknown error');
    }
  };

  const isSaving = createEntry.isPending || updateEntry.isPending || uploadingPhoto;

  return (
    <>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        {/* Form header */}
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onBack} style={styles.formBack}>
            <CategoryIcon name="chevL" size={16} color={colors.ink} />
          </TouchableOpacity>
          <View style={[styles.formIconWrap, { backgroundColor: meta.tint }]}>
            <CategoryIcon name={meta.icon} size={20} color={meta.ink} />
          </View>
          <Text style={styles.formTitle}>{meta.label}</Text>
          <TouchableOpacity onPress={onClose} style={[styles.formBack, styles.formClose]}>
            <CategoryIcon name="close" size={16} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <DateTimeRow value={entryTimestamp} onChange={setEntryTimestamp} />

        {/* ── Check-in ── */}
        {cat === 'checkin' && (
          <>
            <Text style={styles.fieldLabel}>How is {activeSubject?.name ?? 'your child'} feeling today?</Text>
            <View style={styles.scoreRow}>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCheckInScore(n)}
                  style={[styles.scoreBtn, checkInScore === n && styles.scoreBtnActive]}
                >
                  <Text style={[styles.scoreBtnText, checkInScore === n && styles.scoreBtnActiveText]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.scoreLabel}>
              <ScoreDot score={checkInScore} size={48} />
              <Text style={styles.scoreWord}>{scoreWord(checkInScore)}</Text>
            </View>
            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Anything noticeable?</Text>
            <View style={styles.tagWrap}>
              {SYMPTOMS.map((s) => {
                const on = selectedSymptoms.includes(s);
                return (
                  <TouchableOpacity key={s} onPress={() => toggleSymptom(s)}
                    style={[styles.tag, on && styles.tagOn]}>
                    <Text style={[styles.tagText, on && styles.tagTextOn]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Food ── */}
        {cat === 'food' && (
          <>
            <Text style={styles.fieldLabel}>Recipes</Text>
            {recipesError ? (
              <Text style={styles.libraryError}>Could not load recipes: {(recipesError as any)?.message}</Text>
            ) : savedRecipes.length === 0 ? (
              <Text style={styles.emptyHint}>No recipes saved yet — fill in a meal below and tap "Save as recipe"</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
                {savedRecipes.map((r) => {
                  const isSelected = selectedRecipeId === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.foodChip, isSelected && styles.foodChipSelected]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setFoodName(r.name);
                        setFoodIngredients(r.ingredients.join(', '));
                        setSelectedRecipeId(r.id);
                      }}
                    >
                      {isSelected && <CategoryIcon name="check" size={13} color={colors.sageDeep} />}
                      <Text style={[styles.foodChipText, isSelected && styles.foodChipTextSelected]}>{r.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {savedFoods.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Saved foods</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
                  {savedFoods.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.foodChip}
                      activeOpacity={0.7}
                      onPress={() => {
                        setFoodName(f.name);
                        setFoodIngredients(f.ingredients.join(', '));
                      }}
                    >
                      <Text style={styles.foodChipText}>{f.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            {scannedItems.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Scanned items</Text>
                <View style={{ gap: 6, marginBottom: spacing.sm }}>
                  {scannedItems.map((item, idx) => (
                    <View key={idx} style={styles.scannedItemRow}>
                      <CategoryIcon name="barcode" size={14} color={colors.sageDeep} />
                      <Text style={styles.scannedItemName} numberOfLines={1}>{item.name}</Text>
                      {item.ingredients.length > 0 && (
                        <Text style={styles.scannedItemCount}>{item.ingredients.length} ingredients</Text>
                      )}
                      <TouchableOpacity onPress={() => removeScannedItem(idx)} style={styles.scannedItemRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <CategoryIcon name="close" size={13} color={colors.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.scanBtn}
              onPress={openScanner}
              activeOpacity={0.7}
              disabled={barcodeLoading}
            >
              {barcodeLoading ? (
                <ActivityIndicator size="small" color={colors.sageDeep} />
              ) : (
                <CategoryIcon name="barcode" size={18} color={colors.sageDeep} />
              )}
              <Text style={styles.scanBtnText}>
                {barcodeLoading ? 'Looking up…' : scannedItems.length > 0 ? 'Scan another item' : 'Scan barcode'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>
              What did {activeSubject?.name ?? 'your child'} eat?
            </Text>
            <TextInput style={styles.input} placeholder="e.g. Pasta, tomato sauce" placeholderTextColor={colors.faint}
              value={foodName} onChangeText={(v) => { setFoodName(v); setSelectedRecipeId(null); }} />
            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Ingredients (comma-separated)</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Wheat, tomato, basil, olive oil…"
              placeholderTextColor={colors.faint} value={foodIngredients} onChangeText={setFoodIngredients}
              multiline numberOfLines={3} textAlignVertical="top" />
            {foodName.trim() ? (() => {
              const alreadySaved = savedRecipes.some((r) => r.name.toLowerCase() === foodName.trim().toLowerCase());
              const saving = createLibraryItem.isPending;
              return (
                <TouchableOpacity
                  style={[styles.scanBtn, { marginTop: spacing.sm }, alreadySaved && styles.scanBtnSaved]}
                  activeOpacity={alreadySaved || saving ? 1 : 0.7}
                  disabled={alreadySaved || saving}
                  onPress={() => {
                    createLibraryItem.mutate(
                      {
                        type: 'recipe',
                        name: foodName.trim(),
                        ingredients: foodIngredients.split(',').map((s) => s.trim()).filter(Boolean),
                      },
                      {
                        onSuccess: (data) => Alert.alert('Saved', JSON.stringify(data)),
                        onError: (e: any) => Alert.alert('Could not save recipe', e?.message ?? JSON.stringify(e)),
                      }
                    );
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.sageDeep} />
                  ) : (
                    <CategoryIcon name={alreadySaved ? 'check' : 'leaf'} size={16} color={alreadySaved ? colors.sage : colors.sageDeep} />
                  )}
                  <Text style={[styles.scanBtnText, alreadySaved && { color: colors.sage }]}>
                    {alreadySaved ? 'Saved' : saving ? 'Saving…' : 'Save as recipe'}
                  </Text>
                </TouchableOpacity>
              );
            })() : null}
          </>
        )}

        {/* ── Medication / Cream ── */}
        {(cat === 'medication' || cat === 'cream') && (
          <>
            {lastMedEntry && (
              <TouchableOpacity style={styles.repeatBtn} onPress={handleRepeatLastDose} activeOpacity={0.7}>
                <CategoryIcon name="repeat" size={15} color={colors.sageDeep} />
                <Text style={styles.repeatBtnText}>
                  Repeat last dose
                  {(lastMedEntry.payload as any).library_item_name
                    ? ` · ${(lastMedEntry.payload as any).library_item_name}`
                    : ''}
                  {(lastMedEntry.payload as any).dose
                    ? ` · ${(lastMedEntry.payload as any).dose}`
                    : ''}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.fieldLabel}>Select from library</Text>
            {libraryItems.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyLibraryBtn}
                activeOpacity={0.7}
                onPress={() => { onClose(); router.push('/library'); }}
              >
                <Text style={styles.emptyLibrary}>No items in library yet.</Text>
                <Text style={styles.emptyLibraryLink}>Add one in Your library →</Text>
              </TouchableOpacity>
            ) : (
              libraryItems.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => setSelectedLibraryId(item.id)}
                  style={[styles.libraryItem, selectedLibraryId === item.id && styles.libraryItemOn]}>
                  <Text style={styles.libraryItemName}>{item.name}</Text>
                  {item.default_dose && <Text style={styles.libraryItemDose}>{item.default_dose}</Text>}
                  {selectedLibraryId === item.id && <CategoryIcon name="check" size={16} color={colors.sage} />}
                </TouchableOpacity>
              ))
            )}
            {cat === 'cream' && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Where applied?</Text>
                <View style={styles.tagWrap}>
                  {BODY_AREAS.map((a) => {
                    const on = selectedAreas.includes(a);
                    return (
                      <TouchableOpacity key={a} onPress={() => toggleArea(a)} style={[styles.tag, on && styles.tagOn]}>
                        <Text style={[styles.tagText, on && styles.tagTextOn]}>{a}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            {cat === 'medication' && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Dose (optional)</Text>
                <TextInput style={styles.input} placeholder="e.g. 5mg, half teaspoon"
                  placeholderTextColor={colors.faint} value={dose} onChangeText={setDose} />
              </>
            )}
          </>
        )}

        {/* ── Sleep ── */}
        {cat === 'sleep' && (
          <>
            <Text style={styles.fieldLabel}>Hours of sleep</Text>
            <TextInput style={styles.input} placeholder="e.g. 10.5" placeholderTextColor={colors.faint}
              value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" />
            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Quality</Text>
            <View style={styles.qualityRow}>
              {[1,2,3,4,5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setSleepQuality(n)}
                  style={[styles.qualityBtn, sleepQuality === n && styles.qualityBtnOn]}>
                  <Text style={[styles.qualityText, sleepQuality === n && styles.qualityTextOn]}>{['😴','😐','🙂','😊','🌟'][n-1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Notes (optional)</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="e.g. Woke at 2am, teeth bothering…"
              placeholderTextColor={colors.faint} value={sleepNotes} onChangeText={setSleepNotes}
              multiline numberOfLines={3} textAlignVertical="top" />
          </>
        )}

        {/* ── Note ── */}
        {cat === 'note' && (
          <>
            <Text style={styles.fieldLabel}>Quick note</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Skipped bath, warm day…"
              placeholderTextColor={colors.faint} value={noteText} onChangeText={setNoteText}
              multiline numberOfLines={4} textAlignVertical="top" autoFocus />
          </>
        )}

        {/* ── Photo ── */}
        {cat === 'photo' && (
          <>
            <Text style={styles.fieldLabel}>Body area</Text>
            <View style={styles.tagWrap}>
              {BODY_AREAS.map((a) => {
                const on = selectedAreas.includes(a);
                return (
                  <TouchableOpacity key={a} onPress={() => toggleArea(a)} style={[styles.tag, on && styles.tagOn]}>
                    <Text style={[styles.tagText, on && styles.tagTextOn]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {photoUri ? (
              <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <View style={styles.photoChangeOverlay}>
                  <CategoryIcon name="camera" size={18} color="#fff" />
                  <Text style={styles.photoChangeText}>Change photo</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <SoftButton variant="outline" size="md" fullWidth onPress={pickPhoto}
                style={{ marginTop: spacing.md }}>
                Add photo
              </SoftButton>
            )}

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Severity</Text>
            <View style={styles.severityRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setPhotoSeverity(n)}
                  style={[styles.scoreBtn, photoSeverity === n && styles.scoreBtnActive]}
                >
                  <Text style={[styles.scoreBtnText, photoSeverity === n && styles.scoreBtnActiveText]}>{n}</Text>
                </TouchableOpacity>
              ))}
              <ScoreDot score={photoSeverity * 2} size={36} />
            </View>
            <View style={styles.severityHints}>
              <Text style={styles.severityHint}>1 = not bad</Text>
              <Text style={styles.severityHint}>5 = awful</Text>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Caption (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. For tomorrow's appointment"
              placeholderTextColor={colors.faint} value={noteText} onChangeText={setNoteText} />
          </>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <SoftButton variant="outline" size="lg" onPress={onClose} style={{ flex: 1 }}>Cancel</SoftButton>
          <SoftButton variant="primary" size="lg" loading={isSaving}
            onPress={handleSave} style={{ flex: 2 }}>
            {isEditing ? 'Save changes' : 'Save entry'}
          </SoftButton>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,42,36,0.45)' },
  kavContainer: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 36, maxHeight: '82%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline, alignSelf: 'center', marginTop: 8, marginBottom: 4 },

  pickerContent: { paddingHorizontal: 22, paddingBottom: 20 },
  pickerTitle: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.semibold, color: colors.ink, letterSpacing: -0.4, marginBottom: 4 },
  pickerSub: { fontSize: typography.sizes.base, color: colors.muted, marginBottom: 18 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pickerItem: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: colors.hairline,
  },
  pickerIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pickerLabel: { fontSize: 15, fontWeight: '600', color: colors.ink },
  pickerItemSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  formContent: { paddingHorizontal: 22, paddingBottom: 20 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  formBack: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.hairlineSoft, alignItems: 'center', justifyContent: 'center' },
  formClose: { marginLeft: 'auto' },
  formIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  formTitle: { fontSize: 20, fontWeight: '600', color: colors.ink, letterSpacing: -0.3 },

  fieldLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
  input: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: typography.sizes.md, color: colors.ink,
  },
  inputMulti: { minHeight: 90, paddingTop: 14 },

  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.sageSoft, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.sage + '40',
    marginBottom: spacing.sm,
  },
  scanBtnText: { fontSize: 14, fontWeight: '500', color: colors.sageDeep },
  scanBtnSaved: { backgroundColor: colors.sageSoft, borderColor: colors.sage + '80' },
  emptyHint: { fontSize: 13, color: colors.muted, fontStyle: 'italic', marginBottom: spacing.sm },
  libraryError: { fontSize: 13, color: colors.terracotta, marginBottom: spacing.sm },

  scoreRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: spacing.md },
  scoreBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreBtnActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  scoreBtnText: { fontSize: 15, fontWeight: '600', color: colors.muted },
  scoreBtnActiveText: { color: '#fff' },
  scoreLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm },
  scoreWord: { fontSize: 17, fontWeight: '600', color: colors.ink },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    height: 34, paddingHorizontal: 13, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  tagOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  tagText: { fontSize: 13.5, fontWeight: '500', color: colors.ink },
  tagTextOn: { color: '#fff' },

  libraryItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline,
    marginBottom: 8,
  },
  libraryItemOn: { borderColor: colors.sage },
  libraryItemName: { flex: 1, fontSize: typography.sizes.md, fontWeight: '500', color: colors.ink },
  libraryItemDose: { fontSize: typography.sizes.sm, color: colors.muted, marginRight: 8 },
  emptyLibraryBtn: { padding: 16, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, marginBottom: spacing.lg },
  emptyLibrary: { fontSize: typography.sizes.base, color: colors.muted, lineHeight: 20 },
  emptyLibraryLink: { fontSize: typography.sizes.base, color: colors.sageDeep, fontWeight: '500', marginTop: 4 },

  qualityRow: { flexDirection: 'row', gap: 10 },
  qualityBtn: {
    flex: 1, height: 48, borderRadius: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  qualityBtnOn: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  qualityText: { fontSize: 22 },
  qualityTextOn: {},

  photoPreviewWrap: { marginTop: spacing.md, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoPreview: { width: '100%', height: 160 },
  photoChangeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8,
  },
  photoChangeText: { color: '#fff', fontSize: 13, fontWeight: '500' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },

  repeatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.sageSoft, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.sage + '40',
    marginBottom: spacing.md,
  },
  repeatBtnText: { fontSize: 14, fontWeight: '500', color: colors.sageDeep, flex: 1 },

  chipScroll: { marginBottom: spacing.sm },
  chipScrollContent: { gap: 8, paddingBottom: 4 },
  foodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline,
  },
  foodChipSelected: {
    backgroundColor: colors.sageSoft, borderColor: colors.sageDeep,
  },
  foodChipText: { fontSize: 13.5, fontWeight: '500', color: colors.ink },
  foodChipTextSelected: { color: colors.sageDeep, fontWeight: '600' },

  scannedItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.sageSoft, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.sage + '40',
  },
  scannedItemName: { flex: 1, fontSize: 13.5, fontWeight: '500', color: colors.ink },
  scannedItemCount: { fontSize: 12, color: colors.muted },
  scannedItemRemove: { padding: 2 },

  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  severityHints: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  severityHint: { fontSize: 11, color: colors.muted },
});

const dtStyles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    height: 34, paddingHorizontal: 13, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  pillActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  pillText: { fontSize: 13.5, fontWeight: '500', color: colors.ink },
  pillTextActive: { color: colors.sageDeep },
  iosPicker: { marginTop: 6, height: 120 },
});
