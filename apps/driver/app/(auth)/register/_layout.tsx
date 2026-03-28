import { Stack } from "expo-router";
import { RegistrationProvider } from "../../lib/registration-context";

export default function RegisterLayout() {
  return (
    <RegistrationProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_left",
        }}
      />
    </RegistrationProvider>
  );
}
