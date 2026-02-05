import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthScreenProps } from '../../../types/navigation';
import { mobileStyles } from './styles';

const MobileVerification: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [phone, setPhone] = useState('');

  const handleSendCode = () => {
    // Validation removed: allow proceeding without a phone number
    // Simulate sending code
    const simulatedCode = '123456';
    if (phone) {
      Alert.alert('Code sent', `A verification code has been sent to ${phone}`);
    } else {
      Alert.alert('Code sent', 'A verification code has been sent');
    }
    navigation.navigate('OTPEntry', { phone, code: simulatedCode });
  };

  return (
    <View style={mobileStyles.container}>
      <Text style={mobileStyles.title}>Mobile verification</Text>
      <Text style={mobileStyles.subtitle}>Enter your mobile number</Text>

      <TextInput
        style={mobileStyles.input}
        placeholder="Mobile number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={mobileStyles.button} onPress={handleSendCode}>
        <Text style={mobileStyles.buttonText}>Send code</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login') }>
        <Text style={mobileStyles.linkText}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MobileVerification;
