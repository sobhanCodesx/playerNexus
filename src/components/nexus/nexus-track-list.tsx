import { memo, useCallback } from 'react';
import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import type { Track } from '@/data/library';
import { usePlayerActions } from '@/providers/player-provider';
import { NexusTrackRow } from './nexus-cards';

type NexusTrackListProps = {
  tracks: Track[];
  header?: ReactElement | null;
  empty?: ReactElement | null;
  footer?: ReactElement | null;
  showNumber?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onTrackPress?: (track: Track, index: number) => void;
};

function NexusTrackListComponent({
  tracks,
  header,
  empty,
  footer,
  showNumber = true,
  contentContainerStyle,
  onTrackPress,
}: NexusTrackListProps) {
  const { hydrateArtworkWindow } = usePlayerActions();

  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => (
      <NexusTrackRow
        track={item}
        index={index}
        showNumber={showNumber}
        onPress={onTrackPress ? () => onTrackPress(item, index) : undefined}
      />
    ),
    [onTrackPress, showNumber],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Track }> }) => {
      hydrateArtworkWindow(viewableItems.map((token) => token.item).filter(Boolean));
    },
    [hydrateArtworkWindow],
  );

  return (
    <FlashList
      data={tracks}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={empty ?? null}
      ListFooterComponent={footer ?? null}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 18 }}
      drawDistance={420}
      maintainVisibleContentPosition={{ disabled: true }}
    />
  );
}

export const NexusTrackList = memo(NexusTrackListComponent);
