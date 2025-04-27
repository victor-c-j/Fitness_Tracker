import React, { useEffect } from 'react'; // Import useEffect
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Avatar, useTheme } from 'react-native-paper';
import CircularProgress from 'react-native-circular-progress-indicator';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useUser } from '@/context/UserContext'; // Import useUser
import { getUserById } from '@/database/database'; // Import getUserById

export default function HomeScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { currentUserId } = useUser(); // Get current user ID
  const [userName, setUserName] = React.useState<string | null>(null);
  const steps = 7580;
  const stepGoal = 10000;
  const distanceKm = 5.2;
  const calories = 310;
  const recentActivity = "Evening Run - 3.5 km";
  const sleepHours = 7.5;
  const heartRate = 68;
  const currentWeight = 72.3;

  // Fetch user data when component mounts or user ID changes
  useEffect(() => {
    async function fetchUserData() {
      if (currentUserId) {
        try {
          const user = await getUserById(currentUserId);
          setUserName(user?.nombre ?? null); // Set name, handle null user/name
        } catch (error) {
          console.error("Failed to fetch user data for home screen:", error);
          setUserName(null); // Reset name on error
        }
      } else {
        setUserName(null); // Reset name if no user ID
      }
    }
    fetchUserData();
  }, [currentUserId]); // Dependency array includes currentUserId

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollViewContainer}>
        <View style={styles.header}>
          <Text variant="headlineMedium">
            Welcome{userName ? `, ${userName}` : ''}!
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Here's your daily summary:
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <CircularProgress
            value={steps}
            maxValue={stepGoal}
            radius={80}
            title={'Steps'}
            titleStyle={{ ...styles.progressTitle, color: theme.colors.onSurfaceVariant }}
            progressValueStyle={styles.progressValue}
            activeStrokeColor={theme.colors.primary}
            inActiveStrokeColor={theme.colors.surfaceDisabled}
            inActiveStrokeOpacity={0.5}
            activeStrokeWidth={10}
            inActiveStrokeWidth={10}
            duration={1000}
          />
        </View>

        <View style={styles.grid}>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="map-marker-distance"
                style={styles.icon}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
              <View>
                <Text variant="titleMedium">{distanceKm.toFixed(1)} km</Text>
                <Text variant="bodySmall">Distance</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="fire"
                style={styles.icon}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
              <View>
                <Text variant="titleMedium">{calories}</Text>
                <Text variant="bodySmall">Calories Burned</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="bed"
                style={styles.icon}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
              <View>
                <Text variant="titleMedium">{sleepHours.toFixed(1)} hr</Text>
                <Text variant="bodySmall">Sleep</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="heart-pulse"
                style={styles.icon}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
              <View>
                <Text variant="titleMedium">{heartRate} bpm</Text>
                <Text variant="bodySmall">Heart Rate</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={40}
                icon="scale-bathroom"
                style={styles.icon}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
              <View>
                <Text variant="titleMedium">{currentWeight.toFixed(1)} kg</Text>
                <Text variant="bodySmall">Weight</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.card, styles.fullWidthCard]}>
            <Card.Title
              title="Recent Activity"
              left={(props) => <Avatar.Icon {...props} icon="history" size={40} />}
            />
            <Card.Content>
              <Text variant="bodyLarge">{recentActivity}</Text>
              <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                Yesterday, 6:30 PM - 30 min
              </Text>
            </Card.Content>
          </Card>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollViewContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  progressTitle: {
    fontWeight: 'bold',
  },
  progressValue: {
    fontWeight: '500',
    fontSize: 16,
  },
  card: {
    width: '48%',
    marginBottom: 12,
  },
  fullWidthCard: {
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
    backgroundColor: 'transparent',
  },
});
