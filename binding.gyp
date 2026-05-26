{
  "targets": [
    {
      "target_name": "xen_engine",
      "sources": [
        "native/xen_engine.cpp",
        "native/xen_webview.cpp"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
        "<(module_dir)/../native"
      ],
      "dependencies": [],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [
        "V8_DEPRECATION_WARNINGS=1",
        "WIN32_LEAN_AND_MEAN"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "RuntimeLibrary": 2
        },
        "VCLinkerTool": {
          "AdditionalDependencies": [
            "user32.lib",
            "gdi32.lib",
            "shell32.lib",
            "ole32.lib",
            "oleaut32.lib",
            "version.lib",
            "windowscodecs.lib"
          ]
        }
      },
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "-luser32.lib",
            "-lgdi32.lib",
            "-lshell32.lib",
            "-lole32.lib",
            "-loleaut32.lib",
            "-lversion.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalIncludeDirectories": [
                "<(module_dir)/../native"
              ]
            }
          }
        }]
      ]
    }
  ]
}
