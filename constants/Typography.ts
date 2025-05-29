import { StyleSheet } from 'react-native';
import Colors from './Colors';

export default StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gray[800],
    marginBottom: 0,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[800],
    marginBottom: 12,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.gray[700],
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.gray[600],
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray[500],
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[50],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 4,
  },
});