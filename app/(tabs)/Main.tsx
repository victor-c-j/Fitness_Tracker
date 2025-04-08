import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MainScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado */}
      <Text style={styles.header}>6,321</Text>
      <Text style={styles.subheader}>Heart Pts</Text>

      {/* Estadísticas */}
      <View style={styles.statsRow}>
        <Stat label="Cal" value="345" />
        <Stat label="Mins" value="154" />
        <Stat label="Steps" value="7.3k" />
        <Stat label="Sleep" value="7.3h" />
      </View>

      {/* Objetivo semanal */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your weekly target</Text>
        <Text style={styles.cardText}>102 of 150 Heart Points this week</Text>
        <Text style={styles.cardSubtext}>Keep it up! Boost your mood and health.</Text>
      </View>

      {/* Botón flotante */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Barra de navegación inferior */}
      <View style={styles.bottomTabs}>
        <Ionicons name="home" size={24} color="black" />
        <Ionicons name="book" size={24} color="gray" />
        <Ionicons name="person" size={24} color="gray" />
      </View>
    </SafeAreaView>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statBlock}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 40,
    color: '#0a6c8d',
  },
  subheader: {
    fontSize: 18,
    marginBottom: 20,
    color: '#888',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 30,
  },
  statBlock: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#e8f4f7',
    padding: 20,
    width: '90%',
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 30,
    backgroundColor: '#0a6c8d',
    borderRadius: 30,
    padding: 16,
    elevation: 5,
  },
  bottomTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#fff',
  },
});
