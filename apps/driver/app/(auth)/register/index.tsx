import { Redirect } from "expo-router";

export default function RegisterIndex() {
  return <Redirect href="/(auth)/register/step1-personal" />;
}
