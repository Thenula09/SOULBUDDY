import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  closed?: boolean; // true = eye-closed / hidden
};

const EyeIcon: React.FC<Props> = ({ size = 18, color = '#222', closed = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* eye outline */}
    <Path
      d="M1 12C3 7 7 4 12 4s9 3 11 8c-2 5-7 8-11 8S3 17 1 12z"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* pupil (only when open) */}
    {!closed && (
      <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill={color} />
    )}

    {/* slash for closed eye */}
    {closed && (
      <Path d="M3 3l18 18" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    )}
  </Svg>
);

export default EyeIcon;
