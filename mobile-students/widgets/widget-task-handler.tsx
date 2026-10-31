import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderRecentMessagesWidget } from '@/widgets/RecentMessagesWidget';
import { fetchWidgetSnapshotFromServer } from '@/widgets/widget-sync';
import {
  getWidgetLanguage,
  loadWidgetSnapshot,
  saveWidgetSnapshot,
} from '@/widgets/widget-storage';

/**
 * Runs headless (app may be closed) whenever Android asks the widget to draw:
 * added to home screen, periodic update, resize, or a tap on "refresh".
 */
export async function widgetTaskHandler({
  widgetAction,
  clickAction,
  renderWidget,
}: WidgetTaskHandlerProps) {
  const language = await getWidgetLanguage();
  const cached = await loadWidgetSnapshot();

  const refresh = async () => {
    renderWidget(renderRecentMessagesWidget(cached, language, true));
    const fresh = await fetchWidgetSnapshotFromServer();
    if (fresh) await saveWidgetSnapshot(fresh);
    renderWidget(renderRecentMessagesWidget(fresh ?? cached, language));
  };

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
      await refresh();
      break;

    case 'WIDGET_RESIZED':
      renderWidget(renderRecentMessagesWidget(cached, language));
      break;

    case 'WIDGET_CLICK':
      if (clickAction === 'REFRESH') await refresh();
      break;

    default:
      break;
  }
}
