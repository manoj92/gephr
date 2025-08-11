import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingScreenProps {
  message?: string;
  error?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...',
  error = false 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {!error && (
          <ActivityIndicator 
            size="large" 
            color="#00E5FF" 
            style={styles.loader} 
          />
        )}
        
        {error && (
          <Text style={styles.errorIcon}>⚠️</Text>
        )}
        
        <Text style={[
          styles.message,
          error && styles.errorMessage
        ]}>
          {message}
        </Text>
        
        {!error && (
          <Text style={styles.subtitle}>
            Please wait while we set up your robot training environment
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loader: {
    marginBottom: 30,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#FF5555',
  },
  subtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoadingScreen;