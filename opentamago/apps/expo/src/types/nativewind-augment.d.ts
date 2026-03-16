import "react-native";

declare module "react-native" {
  interface ScrollViewProps {
    contentContainerClassName?: string;
  }

  interface TextInputProps {
    placeholderClassName?: string;
  }
}
