/**
 * ✅ Customer App Components Barrel Export
 * Only export lightweight components here.
 * Heavy components (LiveMap, LocationPickerMap) should be imported directly
 * to avoid eagerly loading react-native-webview and expo-location.
 */

export { AppHeader } from './AppHeader';
export { SafeAreaDisplay, SafeAreaScrollView, getFlatListInsets } from './SafeAreaDisplay';
