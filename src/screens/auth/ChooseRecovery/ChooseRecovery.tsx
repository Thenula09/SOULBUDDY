import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import { chooseStyles } from './styles';

const ChooseRecovery: React.FC<AuthScreenProps> = ({ navigation }) => {
  return (
    <View style={chooseStyles.container}>
      <Text style={chooseStyles.title}>Choose recovery method</Text>
      <TouchableOpacity style={chooseStyles.option} onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={chooseStyles.optionText}>Send reset email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={chooseStyles.option} onPress={() => navigation.navigate('MobileVerification')}>
        <Text style={chooseStyles.optionText}>Verify via mobile number</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={chooseStyles.linkText}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChooseRecovery;
