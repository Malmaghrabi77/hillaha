import { Stack } from "expo-router";
import { HALHA_THEME } from "@halha/ui";

const C = HALHA_THEME.colors;

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
