; LinkDit Pad — Windows file association installer hooks.
;
; Windows 8+ stores the user's "Open with" default for a file extension in
; HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\<ext>\UserChoice.
; UserChoice always wins over the extension's registered class (HKLM), so a
; stale choice (e.g. the user once opened a .ldp file with Notepad or an
; editor) keeps .ldp opening in that app even after LinkDit Pad registers its
; own HMKL association.
;
; Deleting the UserChoice just before the association keys are written lets the
; freshly installed "LinkDit Pad" class take over for double-click opens.

!macro NSIS_HOOK_PREINSTALL
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.ldp\UserChoice"
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
    ; Tauri restores the pre-existing association value on uninstall (backup).
    ; Here we also drop any LinkDit Pad UserChoice that an installed run may
    ; have left behind, so the uninstall is clean.
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.ldp\UserChoice"
!macroend