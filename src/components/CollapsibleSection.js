import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-elements';

const CollapsibleSection = ({ 
  title, 
  children, 
  initiallyCollapsed = false,
  style = {},
  titleStyle = {},
  contentStyle = {}
}) => {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [animation] = useState(new Animated.Value(initiallyCollapsed ? 0 : 1));
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: collapsed ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [collapsed, animation]);
  
  const toggleCollapsed = () => {
    // Add a small delay to ensure the touch event is processed completely
    setTimeout(() => {
      setCollapsed(!collapsed);
    }, 50);
  };
  
  const contentHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500], // Max height, adjust as needed
  });
  
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={toggleCollapsed}
        style={styles.header}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        <Icon 
          name={collapsed ? 'chevron-down' : 'chevron-up'} 
          type="ionicon" 
          size={20}
        />
      </TouchableOpacity>
      
      <Animated.View 
        style={[
          styles.content,
          { height: contentHeight, opacity: animation },
          contentStyle
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    overflow: 'hidden',
  },
});

export default CollapsibleSection;