#ifndef XEN_ENGINE_H
#define XEN_ENGINE_H

#include <node.h>
#include <string>
#include <map>

#ifdef _WIN32
#include <windows.h>
#include <webview2.h>
#endif

namespace XenEngine {

struct TabInfo {
    int id;
    std::string url;
    std::string title;
    bool isLoading;
#ifdef _WIN32
    ICoreWebView2* webview;
    ICoreWebView2Controller* controller;
#endif
};

class XenEngine {
public:
    static void Initialize(v8::Local<v8::Object> exports);
    static void Cleanup();
    
private:
    static void Navigate(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void InitializeEngine(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void CreateTab(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void CloseTab(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void GetTabs(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void ExecuteScript(const v8::FunctionCallbackInfo<v8::Value>& args);
    
    static std::map<int, TabInfo> tabs;
    static int nextTabId;
    static bool isInitialized;
#ifdef _WIN32
    static ICoreWebView2Environment* environment;
#endif
};

} // namespace XenEngine

#endif // XEN_ENGINE_H
