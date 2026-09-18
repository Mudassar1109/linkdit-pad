import { useEffect } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useRecentFilesStore } from "@/store/useRecentFilesStore";

export function useSyncRecentFiles() {
  useEffect(() => {
    let prevTabIds = new Set(Object.keys(useEditorStore.getState().tabs));

    const sync = () => {
      const tabs = useEditorStore.getState().tabs;
      const currentIds = new Set(Object.keys(tabs));
      if (currentIds.size === prevTabIds.size && [...currentIds].every((id) => prevTabIds.has(id))) {
        return;
      }
      prevTabIds = currentIds;
      const { addOrUpdate } = useRecentFilesStore.getState();
      for (const tab of Object.values(tabs)) {
        addOrUpdate({
          id: tab.meta.id,
          path: tab.meta.filePath,
          title: tab.meta.title,
          isPinned: tab.meta.isPinned,
          isBookmarked: tab.meta.isBookmarked,
        });
      }
    };

    const { tabs } = useEditorStore.getState();
    const { addOrUpdate } = useRecentFilesStore.getState();
    for (const tab of Object.values(tabs)) {
      addOrUpdate({
        id: tab.meta.id,
        path: tab.meta.filePath,
        title: tab.meta.title,
        isPinned: tab.meta.isPinned,
        isBookmarked: tab.meta.isBookmarked,
      });
    }

    return useEditorStore.subscribe(sync);
  }, []);
}
