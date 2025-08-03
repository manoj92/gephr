import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

interface Room {
  id: string;
  name: string;
  type: 'kitchen' | 'bedroom' | 'living_room' | 'bathroom' | 'office' | 'factory_floor' | 'warehouse';
  objects: EnvironmentObject[];
  coordinates: { x: number; y: number; width: number; height: number };
}

interface EnvironmentObject {
  id: string;
  name: string;
  type: 'furniture' | 'appliance' | 'tool' | 'container' | 'workstation' | 'obstacle';
  position: { x: number; y: number; z: number };
  confidence: number;
  interactable: boolean;
}

const MOCK_ROOMS: Room[] = [
  {
    id: '1',
    name: 'Kitchen',
    type: 'kitchen',
    coordinates: { x: 0, y: 0, width: 400, height: 300 },
    objects: [
      {
        id: 'obj1',
        name: 'Refrigerator',
        type: 'appliance',
        position: { x: 50, y: 50, z: 0 },
        confidence: 0.95,
        interactable: true,
      },
      {
        id: 'obj2',
        name: 'Counter',
        type: 'furniture',
        position: { x: 150, y: 100, z: 0 },
        confidence: 0.92,
        interactable: true,
      },
      {
        id: 'obj3',
        name: 'Sink',
        type: 'appliance',
        position: { x: 200, y: 120, z: 0 },
        confidence: 0.88,
        interactable: true,
      },
    ],
  },
  {
    id: '2',
    name: 'Living Room',
    type: 'living_room',
    coordinates: { x: 400, y: 0, width: 500, height: 400 },
    objects: [
      {
        id: 'obj4',
        name: 'Sofa',
        type: 'furniture',
        position: { x: 450, y: 100, z: 0 },
        confidence: 0.94,
        interactable: false,
      },
      {
        id: 'obj5',
        name: 'Coffee Table',
        type: 'furniture',
        position: { x: 500, y: 150, z: 0 },
        confidence: 0.90,
        interactable: true,
      },
    ],
  },
];

const MappingScreen: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const startMapping = () => {
    setIsScanning(true);
    // Simulate LIDAR scanning
    setTimeout(() => {
      setIsScanning(false);
      Alert.alert(
        'Mapping Complete!',
        'Successfully mapped 2 rooms with 5 objects detected.',
        [{ text: 'OK', onPress: () => console.log('Mapping completed') }]
      );
    }, 3000);
  };

  const addNewRoom = () => {
    Alert.alert(
      'Add New Room',
      'Position your phone and scan the new area',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Scan', 
          onPress: () => {
            console.log('Starting new room scan');
            startMapping();
          }
        }
      ]
    );
  };

  const editObject = (objectId: string) => {
    Alert.alert(
      'Edit Object',
      'Choose an action for this object',
      [
        { text: 'Rename', onPress: () => console.log('Rename object') },
        { text: 'Mark as Interactable', onPress: () => console.log('Mark interactable') },
        { text: 'Delete', onPress: () => console.log('Delete object'), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const RoomCard: React.FC<{ room: Room }> = ({ room }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
    >
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceElevated]}
        style={styles.roomCardGradient}
      >
        <View style={styles.roomHeader}>
          <Text style={styles.roomIcon}>{getRoomIcon(room.type)}</Text>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{room.name}</Text>
            <Text style={styles.roomType}>{room.type.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.roomStats}>
              {room.objects.length} objects • {room.coordinates.width}×{room.coordinates.height}cm
            </Text>
          </View>
          <Text style={styles.expandIcon}>
            {selectedRoom?.id === room.id ? 'v' : '>'}
          </Text>
        </View>

        {selectedRoom?.id === room.id && (
          <View style={styles.objectsList}>
            <Text style={styles.objectsTitle}>Objects in this room:</Text>
            {room.objects.map((object) => (
              <TouchableOpacity
                key={object.id}
                style={styles.objectItem}
                onPress={() => editObject(object.id)}
              >
                <View style={styles.objectInfo}>
                  <Text style={styles.objectIcon}>{getObjectIcon(object.type)}</Text>
                  <View>
                    <Text style={styles.objectName}>{object.name}</Text>
                    <Text style={styles.objectDetails}>
                      {object.type} • {(object.confidence * 100).toFixed(0)}% confidence
                      {object.interactable && ' • Interactable'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.editIcon}>Edit</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'kitchen': return 'Kitchen';
      case 'bedroom': return 'Bedroom';
      case 'living_room': return 'Living';
      case 'bathroom': return 'Bath';
      case 'office': return 'Office';
      case 'factory_floor': return 'Factory';
      case 'warehouse': return 'Warehouse';
      default: return 'Home';
    }
  };

  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'furniture': return 'Chair';
      case 'appliance': return 'Appliance';
      case 'tool': return 'Tool';
      case 'container': return 'Box';
      case 'workstation': return 'Computer';
      case 'obstacle': return 'Warning';
      default: return 'Pin';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Environment Mapping</Text>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={startMapping}
          disabled={isScanning}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <LinearGradient
          colors={[COLORS.primaryDark + '20', COLORS.primary + '10']}
          style={styles.statusGradient}
        >
          <View style={styles.statusContent}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{rooms.length}</Text>
              <Text style={styles.statLabel}>Rooms Mapped</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {rooms.reduce((total, room) => total + room.objects.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Objects Detected</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {rooms.reduce((total, room) => 
                  total + room.objects.filter(obj => obj.interactable).length, 0
                )}
              </Text>
              <Text style={styles.statLabel}>Interactable</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mapped Rooms</Text>
            <TouchableOpacity style={styles.addButton} onPress={addNewRoom}>
              <Text style={styles.addButtonText}>+ Add Room</Text>
            </TouchableOpacity>
          </View>

          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Robot Training Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              • Map multiple angles of each room for better robot navigation
            </Text>
            <Text style={styles.tipText}>
              • Mark all interactable objects for task planning
            </Text>
            <Text style={styles.tipText}>
              • Use LIDAR data when available for precise measurements
            </Text>
            <Text style={styles.tipText}>
              • Update maps regularly as environments change
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  scanButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  scanButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
  },
  statusCard: {
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  statusGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
  },
  roomCard: {
    marginBottom: SPACING.md,
  },
  roomCardGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  roomType: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  roomStats: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  expandIcon: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  objectsList: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  objectsTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  objectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  objectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  objectIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  objectName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  objectDetails: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  editIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  tipCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  tipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
});

export default MappingScreen; 