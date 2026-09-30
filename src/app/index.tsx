import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthScreen } from '@/components/auth-screen';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

export default function HomeScreen() {
  const { session, user, loading: authLoading, signOut } = useAuth();
  const theme = useTheme();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [creatingTodo, setCreatingTodo] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchTodos();
    } else {
      setTodos([]);
    }
  }, [session?.user]);

  const fetchTodos = async () => {
    try {
      setLoadingTodos(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (err: any) {
      console.warn('Could not load todos (ensure tables are created in Supabase):', err.message);
    } finally {
      setLoadingTodos(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      setCreatingTodo(true);
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title: newTodoTitle.trim(), is_completed: false }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTodos((prev) => [data, ...prev]);
        setNewTodoTitle('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreatingTodo(false);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      const nextCompleted = !todo.is_completed;
      setTodos((prev) =>
        prev.map((item) => (item.id === todo.id ? { ...item, is_completed: nextCompleted } : item))
      );

      const { error } = await supabase
        .from('todos')
        .update({ is_completed: nextCompleted })
        .eq('id', todo.id);

      if (error) {
        // Rollback on error
        setTodos((prev) =>
          prev.map((item) => (item.id === todo.id ? { ...item, is_completed: todo.is_completed } : item))
        );
        Alert.alert('Error', error.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      setTodos((prev) => prev.filter((item) => item.id !== id));
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) {
        fetchTodos();
        Alert.alert('Error', error.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  // If user is not logged in, show the AuthScreen
  if (!session?.user) {
    return (
      <ThemedView style={styles.container}>
        <AuthScreen />
      </ThemedView>
    );
  }

  // Logged-in view: User Profile header, Sign Out button, and Todos list
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle">My Tasks</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user?.email}
            </ThemedText>
          </View>
          <Pressable style={styles.signOutButton} onPress={signOut}>
            <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
          </Pressable>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
            placeholder="Add a new task..."
            placeholderTextColor={theme.textSecondary}
            value={newTodoTitle}
            onChangeText={setNewTodoTitle}
            onSubmitEditing={handleAddTodo}
            returnKeyType="done"
          />
          <Pressable
            style={[
              styles.addButton,
              (!newTodoTitle.trim() || creatingTodo) && styles.disabledButton,
            ]}
            onPress={handleAddTodo}
            disabled={!newTodoTitle.trim() || creatingTodo}>
            {creatingTodo ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.addButtonText}>Add</ThemedText>
            )}
          </Pressable>
        </View>

        {loadingTodos ? (
          <View style={styles.loadingList}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            data={todos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No tasks yet. Add one above!
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.todoCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}>
                <Pressable
                  style={styles.todoCheckContainer}
                  onPress={() => toggleTodo(item)}>
                  <View
                    style={[
                      styles.checkbox,
                      item.is_completed && styles.checkboxActive,
                    ]}>
                    {item.is_completed && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                  </View>
                  <ThemedText
                    style={[
                      styles.todoTitle,
                      item.is_completed && styles.todoCompletedText,
                    ]}>
                    {item.title}
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => deleteTodo(item.id)}>
                  <ThemedText style={styles.deleteButtonText}>✕</ThemedText>
                </Pressable>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    marginBottom: Spacing.three,
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ff3b3020',
  },
  signOutText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingList: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  listContent: {
    gap: Spacing.two,
  },
  todoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  todoCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  todoTitle: {
    fontSize: 16,
    flex: 1,
  },
  todoCompletedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  deleteButton: {
    padding: Spacing.two,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
