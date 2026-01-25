import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, Keyboard } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import SafeArea from '../../components/SafeArea';
import AddressInput from '../../components/AddressInput';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';

type AddContactScreenRouteProp = RouteProp<DetailViewStackParamList, 'AddContactScreen'>;
type AddContactScreenNavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'AddContactScreen'>;

const AddContactScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<AddContactScreenNavigationProp>();
  const route = useRoute<AddContactScreenRouteProp>();
  const { walletID } = route.params;
  const [paymentCode, setPaymentCode] = useState('');

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    label: {
      color: colors.foregroundColor,
    },
    description: {
      color: colors.alternativeTextColor2,
    },
  });

  // Handle scanned QR code from ScanQRCode screen
  useEffect(() => {
    if (route.params?.onBarScanned) {
      const scannedData = route.params.onBarScanned;
      if (typeof scannedData === 'string') {
        setPaymentCode(scannedData);
      } else if (scannedData?.data) {
        setPaymentCode(scannedData.data);
      }
      // Clear the param to prevent re-processing
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [route.params?.onBarScanned, navigation]);

  const handleAddContact = useCallback(() => {
    if (!paymentCode.trim()) {
      return;
    }
    
    Keyboard.dismiss();
    
    // Navigate back to PaymentCodeList with the payment code
    navigation.navigate('PaymentCodeList', {
      walletID,
      paymentCode: paymentCode.trim(),
    });
  }, [paymentCode, walletID, navigation]);

  const handleChangeText = useCallback((text: string) => {
    setPaymentCode(text);
  }, []);

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <View style={styles.content}>
        <Text style={[styles.label, stylesHook.label]}>{loc.bip47.add_contact}</Text>
        <Text style={[styles.description, stylesHook.description]}>
          {loc.bip47.provide_payment_code}
        </Text>

        <View style={styles.inputContainer}>
          <AddressInput
            address={paymentCode}
            onChangeText={handleChangeText}
            placeholder={loc.bip47.provide_payment_code}
            inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            testID="AddContactInput"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={loc.bip47.add_contact}
            onPress={handleAddContact}
            disabled={!paymentCode.trim()}
            testID="AddContactButton"
          />
        </View>
      </View>
      <DismissKeyboardInputAccessory />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 10,
  },
});

export default AddContactScreen;
