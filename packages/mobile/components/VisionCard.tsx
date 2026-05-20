import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'
import type { VisionCardItem } from '../hooks/useVisionCards'

type VisionCardProps = {
  card: VisionCardItem
  onLongPress?: (card: VisionCardItem) => void
}

export function VisionCard({ card, onLongPress }: VisionCardProps) {
  return (
    <Pressable onLongPress={() => onLongPress?.(card)} style={styles.card}>
      <Image source={{ uri: card.image_url }} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <Text style={styles.caption}>{card.caption ?? 'Dream big'}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    minHeight: 220,
  },
  image: {
    width: '100%',
    height: 220,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  caption: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
})
