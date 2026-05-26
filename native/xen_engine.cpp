#include "xen_engine.h"
#include <node.h>
#include <nan.h>
#include <windows.h>
#include <iostream>
#include <map>
#include <wrl.h>

using namespace Microsoft::WRL;

namespace XenEngine {

// Static members
std::map<int, TabInfo> XenEngine::tabs;
int XenEngine::nextTabId = 1;
bool XenEngine::isInitialized = false;
#ifdef _WIN32
ICoreWebView2Environment* XenEngine::environment = nullptr;
#endif

void Cleanup() {
#ifdef _WIN32
    for (auto& pair : tabs) {
        if (pair.second.controller) {
            pair.second.controller->Close();
            pair.second.controller->Release();
        }
        if (pair.second.webview) {
            pair.second.webview->Release();
        }
    }
    tabs.clear();
    
    if (environment) {
        environment->Release();
        environment = nullptr;
    }
#endif
    isInitialized = false;
}

#ifdef _WIN32
class WebView2EnvironmentHandler : public ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler {
public:
    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, LPVOID* ppvObject) override {
        if (riid == IID_IUnknown || riid == IID_ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler) {
            *ppvObject = this;
            AddRef();
            return S_OK;
        }
        return E_NOINTERFACE;
    }

    ULONG STDMETHODCALLTYPE AddRef() override { return 1; }
    ULONG STDMETHODCALLTYPE Release() override { return 1; }

    HRESULT STDMETHODCALLTYPE Invoke(HRESULT result, ICoreWebView2Environment* env) override {
        if (SUCCEEDED(result)) {
            XenEngine::environment = env;
            XenEngine::isInitialized = true;
            std::cout << "XenEngine: WebView2 environment initialized" << std::endl;
        }
        return S_OK;
    }
};
#endif

void InitializeEngine(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    
#ifdef _WIN32
    if (!isInitialized) {
        HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
        
        ComPtr<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler> handler = 
            Make<WebView2EnvironmentHandler>();
        
        hr = CreateCoreWebView2EnvironmentWithOptions(
            nullptr, nullptr, nullptr, handler.Get());
        
        if (SUCCEEDED(hr)) {
            args.GetReturnValue().Set(v8::String::NewFromUtf8(isolate, "Initializing WebView2...").ToLocalChecked());
            return;
        }
    }
#endif
    
    isInitialized = true;
    std::cout << "XenEngine: Custom Chromium engine initialized" << std::endl;
    args.GetReturnValue().Set(v8::String::NewFromUtf8(isolate, "Engine initialized").ToLocalChecked());
}

void Navigate(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    
    if (args.Length() < 2) {
        isolate->ThrowException(v8::Exception::TypeError(
            v8::String::NewFromUtf8(isolate, "Wrong number of arguments").ToLocalChecked()));
        return;
    }
    
    int tabId = args[0]->Int32Value(isolate->GetCurrentContext()).FromJust();
    v8::String::Utf8Value url(isolate, args[1]);
    std::string urlStr(*url);
    
    auto it = tabs.find(tabId);
    if (it != tabs.end()) {
#ifdef _WIN32
        if (it->second.webview) {
            std::wstring wurl(urlStr.begin(), urlStr.end());
            it->second.webview->Navigate(wurl.c_str());
        }
#endif
        it->second.url = urlStr;
        std::cout << "XenEngine: Navigating tab " << tabId << " to " << urlStr << std::endl;
    }
    
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

void CreateTab(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    
    v8::String::Utf8Value url(isolate, args[0]);
    std::string urlStr = args.Length() > 0 ? std::string(*url) : "about:blank";
    
    TabInfo tab;
    tab.id = nextTabId++;
    tab.url = urlStr;
    tab.title = "New Tab";
    tab.isLoading = false;
#ifdef _WIN32
    tab.webview = nullptr;
    tab.controller = nullptr;
#endif
    
    tabs[tab.id] = tab;
    
    v8::Local<v8::Object> result = v8::Object::New(isolate);
    result->Set(isolate->GetCurrentContext(), 
                v8::String::NewFromUtf8(isolate, "id").ToLocalChecked(),
                v8::Number::New(isolate, tab.id));
    result->Set(isolate->GetCurrentContext(),
                v8::String::NewFromUtf8(isolate, "url").ToLocalChecked(),
                v8::String::NewFromUtf8(isolate, tab.url.c_str()).ToLocalChecked());
    
    std::cout << "XenEngine: Created tab " << tab.id << std::endl;
    args.GetReturnValue().Set(result);
}

void CloseTab(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    
    if (args.Length() < 1) {
        isolate->ThrowException(v8::Exception::TypeError(
            v8::String::NewFromUtf8(isolate, "Wrong number of arguments").ToLocalChecked()));
        return;
    }
    
    int tabId = args[0]->Int32Value(isolate->GetCurrentContext()).FromJust();
    
    auto it = tabs.find(tabId);
    if (it != tabs.end()) {
#ifdef _WIN32
        if (it->second.controller) {
            it->second.controller->Close();
            it->second.controller->Release();
        }
        if (it->second.webview) {
            it->second.webview->Release();
        }
#endif
        tabs.erase(it);
        std::cout << "XenEngine: Closed tab " << tabId << std::endl;
    }
    
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

void GetTabs(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    
    v8::Local<v8::Array> tabsArray = v8::Array::New(isolate, tabs.size());
    int index = 0;
    
    for (const auto& pair : tabs) {
        v8::Local<v8::Object> tabObj = v8::Object::New(isolate);
        tabObj->Set(isolate->GetCurrentContext(),
                    v8::String::NewFromUtf8(isolate, "id").ToLocalChecked(),
                    v8::Number::New(isolate, pair.second.id));
        tabObj->Set(isolate->GetCurrentContext(),
                    v8::String::NewFromUtf8(isolate, "url").ToLocalChecked(),
                    v8::String::NewFromUtf8(isolate, pair.second.url.c_str()).ToLocalChecked());
        tabObj->Set(isolate->GetCurrentContext(),
                    v8::String::NewFromUtf8(isolate, "title").ToLocalChecked(),
                    v8::String::NewFromUtf8(isolate, pair.second.title.c_str()).ToLocalChecked());
        tabObj->Set(isolate->GetCurrentContext(),
                    v8::String::NewFromUtf8(isolate, "isLoading").ToLocalChecked(),
                    v8::Boolean::New(isolate, pair.second.isLoading));
        
        tabsArray->Set(isolate->GetCurrentContext(), index, tabObj);
        index++;
    }
    
    args.GetReturnValue().Set(tabsArray);
}

void ExecuteScript(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    
    if (args.Length() < 2) {
        isolate->ThrowException(v8::Exception::TypeError(
            v8::String::NewFromUtf8(isolate, "Wrong number of arguments").ToLocalChecked()));
        return;
    }
    
    int tabId = args[0]->Int32Value(isolate->GetCurrentContext()).FromJust();
    v8::String::Utf8Value script(isolate, args[1]);
    std::string scriptStr(*script);
    
    auto it = tabs.find(tabId);
    if (it != tabs.end()) {
#ifdef _WIN32
        if (it->second.webview) {
            std::wstring wscript(scriptStr.begin(), scriptStr.end());
            it->second.webview->ExecuteScript(wscript.c_str(), nullptr);
        }
#endif
        std::cout << "XenEngine: Executing script in tab " << tabId << std::endl;
    }
    
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

void Initialize(v8::Local<v8::Object> exports) {
    NODE_SET_METHOD(exports, "initialize", InitializeEngine);
    NODE_SET_METHOD(exports, "navigate", Navigate);
    NODE_SET_METHOD(exports, "createTab", CreateTab);
    NODE_SET_METHOD(exports, "closeTab", CloseTab);
    NODE_SET_METHOD(exports, "getTabs", GetTabs);
    NODE_SET_METHOD(exports, "executeScript", ExecuteScript);
    NODE_SET_METHOD(exports, "cleanup", Cleanup);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

} // namespace XenEngine
