import { useWindowDimensions } from 'react-native'

export function useLayout() {
  const { width, height } = useWindowDimensions()

  const isSmall = width < 360
  const isMedium = width >= 360 && width <= 428
  const isLarge = width > 428

  const tileColumns = isSmall ? 2 : 3
  const tileGap = 8
  const tilePadding = 16
  const tileWidth = (width - tilePadding * 2 - tileGap * (tileColumns - 1)) / tileColumns

  const timerRingSize = Math.min(width * 0.55, 280)
  const modalMaxHeight = height * 0.8

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    tileColumns,
    tileWidth,
    tileGap,
    tilePadding,
    timerRingSize,
    modalMaxHeight,
  }
}
