import { useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import { Button, type ButtonProps } from './Button';

interface AutoWidthButtonProps extends ButtonProps {
  /** Button width as a multiple of the label's natural text width. Defaults to 1.3. */
  widthMultiplier?: number;
}

/**
 * A Button sized to a fixed multiple of its label's natural text width,
 * instead of Button's default text-hugging + fixed padding. Measures the
 * label with an invisible Text node on mount, then applies the computed
 * width - so short and long labels get proportionally consistent breathing
 * room instead of the same flat padding.
 */
export function AutoWidthButton({
  label,
  widthMultiplier = 1.3,
  containerClassName,
  style,
  ...rest
}: AutoWidthButtonProps) {
  const [textWidth, setTextWidth] = useState<number | null>(null);

  function handleTextLayout(e: LayoutChangeEvent) {
    setTextWidth(e.nativeEvent.layout.width);
  }

  return (
    <>
      <View
        style={{ position: 'absolute', opacity: 0 }}
        onLayout={handleTextLayout}
        pointerEvents="none"
      >
        <Text className="font-medium">{label}</Text>
      </View>
      <Button
        label={label}
        containerClassName={containerClassName}
        style={textWidth !== null ? { width: textWidth * widthMultiplier } : style}
        {...rest}
      />
    </>
  );
}
