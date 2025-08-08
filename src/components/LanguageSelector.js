import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useLanguage } from '../config/localization';

const LanguageSelector = ({ style }) => {
  const { language, changeLanguage } = useLanguage();

  const languages = [
    { label: 'English', value: 'en' },
    { label: 'العربية', value: 'ar' }
  ];

  return (
    <View style={[styles.container, style]}>
      <Dropdown
        style={styles.dropdown}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        data={languages}
        search
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder="Select Language"
        searchPlaceholder="Search..."
        value={language}
        onChange={(item) => {
          changeLanguage(item.value);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    minWidth: 150,
    width: '100%',
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});

export default LanguageSelector;
