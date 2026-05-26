; ── Xenixa Browser — Custom NSIS Installer Script ────────────────────────────
; Cloudflare WARP CLI kurulumu ve gereksinim kontrolleri

!macro customInstall
  ; ── Visual C++ Redistributable kontrolü ───────────────────────────────────
  DetailPrint "Visual C++ Redistributable kontrol ediliyor..."
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    DetailPrint "Visual C++ 2015-2022 Redistributable indiriliyor..."
    nsExec::ExecToLog '"$INSTDIR\resources\vc_redist.x64.exe" /install /quiet /norestart'
    DetailPrint "Visual C++ Redistributable kuruldu."
  ${Else}
    DetailPrint "Visual C++ Redistributable zaten kurulu."
  ${EndIf}

!macroend

!macro customUnInstall
  ; Kaldırma sırasında WARP'ı kaldırma (isteğe bağlı — şimdilik bırakıyoruz)
  DetailPrint "Xenixa Browser kaldırılıyor..."
!macroend
