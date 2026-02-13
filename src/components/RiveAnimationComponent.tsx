import React from 'react';
import { View, StyleSheet } from 'react-native';
import Rive from 'rive-react-native';

interface RiveAnimationComponentProps {
  resourceName: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  style?: object;
}

const RiveAnimationComponent: React.FC<RiveAnimationComponentProps> = ({
  resourceName,
  width = 200,
  height = 200,
  autoplay = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Rive
        resourceName={resourceName}
        style={{ width, height }}
        autoplay={autoplay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RiveAnimationComponent;