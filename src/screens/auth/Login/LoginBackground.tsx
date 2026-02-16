import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Use, Path } from 'react-native-svg';

const LoginBackground: React.FC = () => {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 1080 1920"
      preserveAspectRatio="xMidYMid meet"
      style={styles.svg}
    >
       
        <Use href="#img1" x="0" y="0" />
        <Path
          fillRule="evenodd"
          fill="#ffffff"
          d="m-689.4-370h2609.8c110.5 0 200 89.5 200 200v2041c0 110.5-89.5 200-200 200h-2609.8c-110.5 0-200-89.5-200-200v-2041c0-110.5 89.5-200 200-200z"
        />
        <Path
          fillRule="evenodd"
          fill="#2011F9"
          d="m116 13.7h848.8c55.2 0 100 44.8 100 100v943.1c0 55.2-44.8 100-100 100h-848.8c-55.2 0-100-44.8-100-100v-943.1c0-55.2 44.8-100 100-100z"
        />
        <Path
          fillRule="evenodd"
          fill="#ffffff"
          d="m300 650h1052.8c165.7 0 300 134.3 300 300v943c0 165.7-134.3 300-300 300h-1052.8c-165.7 0-300-134.3-300-300v-943c0-165.7 134.3-300 300-300z"
        />
      </Svg>
  );
};

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    marginTop: -60,
  },
});

export default LoginBackground;
