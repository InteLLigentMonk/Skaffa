import useKeyboardVisible from "@/hooks/use-keyboard-visible";
import React from "react";
import { KeyboardAvoidingView, View } from "react-native";

const ModalScreen = ({ children }: { children: React.ReactNode }) => {
  const isKeyboardVisible = useKeyboardVisible();

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <View
        className={`flex-1 gap-4 px-5 pt-safe-offset-4 ${isKeyboardVisible ? "pb-3" : "pb-safe-offset-3"}`}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
};

export default ModalScreen;
