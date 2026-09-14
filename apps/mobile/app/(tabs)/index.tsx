import { Redirect } from "expo-router";

export default function HiddenHomeRoute() {
  return <Redirect href="/(tabs)/tickets" />;
}
