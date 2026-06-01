import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePhotoEntries } from '@/hooks/usePhotoEntries';
import type { PhotoPayload, LogEntry } from '@/lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  );
}

function BottomScrim({
  entry,
  isSingleMode,
  singleTimestamp,
  paddingBottom,
}: {
  entry?: LogEntry;
  isSingleMode: boolean;
  singleTimestamp?: string;
  paddingBottom: number;
}) {
  const payload = entry?.payload as PhotoPayload | undefined;
  const hasContent = isSingleMode ? !!singleTimestamp : !!entry;
  if (!hasContent) return null;

  return (
    <View style={[styles.bottomScrim, { paddingBottom }]}>
      {isSingleMode ? (
        <Text style={styles.dateLabel}>{formatDateTime(singleTimestamp!)}</Text>
      ) : (
        <>
          {payload?.caption ? <Text style={styles.caption}>{payload.caption}</Text> : null}
          <Text style={styles.dateLabel}>{formatDateTime(entry!.timestamp)}</Text>
        </>
      )}
    </View>
  );
}

export default function PhotoViewer() {
  const params = useLocalSearchParams();
  const entryId = params.entryId as string | undefined;
  const subjectId = params.subjectId as string | undefined;
  const singleUrl = params.singleUrl as string | undefined;
  const singleTimestamp = params.singleTimestamp as string | undefined;

  const insets = useSafeAreaInsets();
  const isSingleMode = !!singleUrl;

  const { data: photoEntries = [], isLoading } = usePhotoEntries(
    isSingleMode ? undefined : subjectId
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const indexInitialized = useRef(false);

  useEffect(() => {
    if (!indexInitialized.current && !isSingleMode && photoEntries.length > 0) {
      indexInitialized.current = true;
      const idx = photoEntries.findIndex((e) => e.id === entryId);
      setCurrentIndex(idx >= 0 ? idx : 0);
    }
  }, [photoEntries.length]);

  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 120 || vy > 0.8) {
          router.back();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!isSingleMode && isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#fff" size="large" />
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const initialIndex = (() => {
    const idx = photoEntries.findIndex((e) => e.id === entryId);
    return idx >= 0 ? idx : 0;
  })();

  const currentEntry = photoEntries[currentIndex];

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      {isSingleMode ? (
        <Image source={{ uri: singleUrl! }} style={styles.image} resizeMode="contain" />
      ) : (
        <FlatList
          data={photoEntries}
          keyExtractor={(e) => e.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setCurrentIndex(idx);
          }}
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Image
                source={{ uri: item.photo_urls[0] }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      {!isSingleMode && photoEntries.length > 1 && (
        <Text style={[styles.counter, { top: insets.top + 16 }]}>
          {currentIndex + 1} / {photoEntries.length}
        </Text>
      )}

      <BottomScrim
        entry={currentEntry}
        isSingleMode={isSingleMode}
        singleTimestamp={singleTimestamp}
        paddingBottom={insets.bottom + 16}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    width: SCREEN_W,
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  counter: {
    position: 'absolute',
    right: 16,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    zIndex: 10,
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 48,
    backgroundColor: 'rgba(0,0,0,0.52)',
    zIndex: 10,
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '400',
  },
});
