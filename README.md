# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite using StateZero to connect to a Django backend. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

# StateZero ORM - LLM Implementation Guide

## 🔍 What is StateZero?

StateZero is a **Django ORM port for JavaScript/TypeScript frontends**. If you know Django, you already know StateZero:

- **Same QuerySet API**: `Model.objects.filter()`, `exclude()`, `orderBy()` 
- **Same field lookups**: `field__contains`, `field__gt`, `field__year`
- **Same relationships**: `category__name`, `user__profile__bio`
- **Same CRUD operations**: `create()`, `update()`, `delete()`, `get_or_create()`

**Key difference**: StateZero adds **reactive/optimistic updates** for modern frontend frameworks.

Models are auto-generated in `./src/models/` from your Django backend schemas.

## 🚨 CRITICAL: LLM Decision Tree for StateZero

**STEP 1: Do you need server-confirmed results?**
- 🚀 **Optimistic/Reactive** (immediate response) → NO await, use `useQueryset()`
- ✅ **Confirmed** (wait for server) → Use `await`

**STEP 2: Quick Pattern Check**
```javascript
// 🟢 OPTIMISTIC - Get immediate results that update automatically
const todos = useQueryset(() => Todo.objects.filter({ active: true }));
// Use: todos.fetch(), todos.count(), todos.first() in templates

// 🟢 CONFIRMED - Wait for server confirmation
const todos = await Todo.objects.filter({ active: true }).fetch();
// Use: When you need to ensure data is current before proceeding
```

**STEP 3: Template Usage**
```vue
<!-- 🟢 CORRECT - Direct reactive usage -->
<div v-for="todo in todos.fetch()" :key="todo.id">{{ todo.title }}</div>
<p>Count: {{ todos.count() }}</p>

<!-- 🟢 ALSO CORRECT - Store in computed/ref (StateZero handles reactivity) -->
<div v-for="todo in todoList" :key="todo.id">{{ todo.title }}</div>
```

## 🎯 LLM Code Generation Rules

### Rule 1: Import Pattern
```javascript
// ✅ ALWAYS start Vue components like this
import { ref, computed } from 'vue';
import { useQueryset } from '@statezero/core/vue';
import { Todo, Category, User } from '../models'; // Import from ./src/models/
```

### Rule 2: Setup Function Structure
```javascript
export default {
  setup() {
    // 1. Reactive variables first
    const searchQuery = ref('');
    const selectedFilter = ref('');
    
    // 2. Reactive querysets second
    const todos = useQueryset(() => {
      let query = Todo.objects.all();
      if (searchQuery.value) {
        query = query.filter({ title__icontains: searchQuery.value });
      }
      return query.orderBy('-created_at');
    });
    
    // 3. Computed values (optional - can use querysets directly)
    const todoList = computed(() => todos.value.fetch({ limit: 10 }));
    const todoCount = computed(() => todos.value.count());
    
    // 4. Functions for user actions (use await when you need confirmation)
    const handleCreate = async (data) => {
      // Wait for server confirmation before proceeding
      const newTodo = await Todo.objects.create(data);
      console.log('Confirmed created:', newTodo.id);
      // Reactive queries update automatically after this
    };
    
    // Alternative: Optimistic create (immediate UI update)
    const handleOptimisticCreate = (data) => {
      Todo.objects.create(data); // No await - immediate optimistic update
      // UI updates immediately, confirms in background
    };
    
    // 5. Return everything
    return { searchQuery, todos, todoList, todoCount, handleCreate };
  }
};
```

### Rule 3: Optimistic vs Confirmed Results
```javascript
// ✅ OPTIMISTIC - Immediate results, updates automatically (preferred for UI)
const todos = useQueryset(() => Todo.objects.all());
const todoList = computed(() => todos.value.fetch()); // Immediate + reactive

// ✅ CONFIRMED - Wait for server confirmation (when accuracy is critical)
const handleCriticalOperation = async () => {
  const confirmedTodos = await Todo.objects.all().fetch(); // Wait for server
  // Use confirmed data for important calculations
};

// ✅ BOTH PATTERNS WORK - Choose based on needs
const todos = ref([]);
const fetchTodos = async () => {
  todos.value = await Todo.objects.all().fetch(); // Manual confirmed fetching
};

// 🔴 WRONG: Don't mix patterns inconsistently
const todos = useQueryset(() => Todo.objects.all()); // Optimistic
const moreTodos = await Todo.objects.filter({ active: true }).fetch(); // Confirmed - inconsistent approach
```

### Rule 4: Django-Style Field Lookups (Exact Same as Django)
```javascript
// Text lookups (case-sensitive)
Todo.objects.filter({ title__contains: 'urgent' })
Todo.objects.filter({ title__startswith: 'TODO:' })
Todo.objects.filter({ title__endswith: '!' })
Todo.objects.filter({ title__exact: 'Buy groceries' })

// Text lookups (case-insensitive - add 'i' prefix)
Todo.objects.filter({ title__icontains: 'URGENT' })
Todo.objects.filter({ title__istartswith: 'todo:' })
Todo.objects.filter({ title__iexact: 'buy groceries' })

// Numeric comparisons
Todo.objects.filter({ priority__gt: 5 })        // Greater than
Todo.objects.filter({ priority__gte: 5 })       // Greater than or equal
Todo.objects.filter({ priority__lt: 10 })       // Less than
Todo.objects.filter({ priority__lte: 10 })      // Less than or equal

// Lists and null checks
Todo.objects.filter({ status__in: ['active', 'pending'] })
Todo.objects.filter({ due_date__isnull: false })

// Date/time lookups (exactly like Django)
Todo.objects.filter({ created_at__year: 2024 })
Todo.objects.filter({ created_at__month: 6 })
Todo.objects.filter({ created_at__day: 15 })
Todo.objects.filter({ created_at__hour: 14 })
Todo.objects.filter({ created_at__minute: 30 })

// Relationship traversal (double underscores like Django)
Todo.objects.filter({ category__name: 'Work' })
Todo.objects.filter({ created_by__username: 'johndoe' })
Todo.objects.filter({ category__parent__name: 'Projects' })
Todo.objects.filter({ assigned_to__profile__department: 'Engineering' })
```

## 📋 Complete Django-Style API Reference

### Manager Methods (Same as Django)
```javascript
// Basic queries
Todo.objects.all()                              // All records
Todo.objects.filter({ completed: false })       // Filter records
Todo.objects.exclude({ archived: true })        // Exclude records
Todo.objects.get({ id: 1 })                    // Single record (throws if 0 or >1)

// Aggregations
Todo.objects.count()                            // Count all
Todo.objects.filter({ completed: true }).count() // Count filtered
Todo.objects.sum('priority')                    // Sum field values
Todo.objects.avg('priority')                    // Average field values
Todo.objects.min('created_at')                  // Minimum value
Todo.objects.max('created_at')                  // Maximum value

// Creation
Todo.objects.create({ title: 'New Todo' })     // Create record
Todo.objects.get_or_create(                    // Get existing or create
  { title: 'Unique Todo' },                   // Lookup
  { description: 'Default desc' }             // Defaults
)
Todo.objects.update_or_create(                 // Update existing or create
  { title: 'Unique Todo' },                   // Lookup
  { priority: 5, completed: false }           // Values to set
)
```

### QuerySet Methods (Chainable, like Django)
```javascript
Todo.objects
  .filter({ completed: false })                 // Include matching
  .exclude({ archived: true })                  // Exclude matching
  .search('urgent', ['title', 'description'])   // Full-text search
  .orderBy('-created_at', 'priority')          // Order by fields (- for desc)
  .fetch({ limit: 10, offset: 20 })           // Execute with pagination
```

### CRUD Operations (Django-style)
```javascript
// Create
const todo = await Todo.objects.create({
  title: 'New Task',
  description: 'Task description',
  category: categoryId,
  completed: false
});

// Read single
const todo = await Todo.objects.get({ id: 1 });
const todo = await Todo.objects.filter({ id: 1 }).first(); // Safe version

// Read multiple
const todos = await Todo.objects.filter({ completed: false }).fetch();

// Update instance
todo.title = 'Updated Title';
await todo.save();
// OR
await todo.update({ title: 'Updated Title', completed: true });

// Delete instance
await todo.delete();

// Bulk operations
await Todo.objects.filter({ completed: true }).update({ archived: true });
await Todo.objects.filter({ archived: true }).delete();
```

## 🎨 Complete Vue Component Pattern

```vue
<template>
  <div>
    <!-- Search and filters -->
    <input v-model="searchQuery" placeholder="Search todos..." />
    <select v-model="selectedCategory">
      <option value="">All Categories</option>
      <option v-for="cat in categories.fetch()" :key="cat.id" :value="cat.id">
        {{ cat.name }} ({{ cat.total_todos }})
      </option>
    </select>
    
    <!-- Stats (automatically calculated) -->
    <div class="stats">
      <p>Total: {{ todos.count() }}</p>
      <p>Completed: {{ completedCount }}</p>
      <p>High Priority: {{ highPriorityTodos.count() }}</p>
    </div>
    
    <!-- Todo list (automatically updates) -->
    <div v-for="todo in paginatedTodos" :key="todo.id" class="todo-item">
      <h3>{{ todo.title }}</h3>
      <p>{{ todo.description }}</p>
      <div class="meta">
        <span>Category: {{ todo.category?.name }}</span>
        <span>Priority: {{ todo.priority }}</span>
        <span>Created: {{ formatDate(todo.created_at) }}</span>
        <span>By: {{ todo.created_by?.username }}</span>
      </div>
      
      <div class="actions">
        <button @click="toggleComplete(todo)">
          {{ todo.completed ? 'Mark Incomplete' : 'Mark Complete' }}
        </button>
        <button @click="updatePriority(todo, todo.priority + 1)">
          Increase Priority
        </button>
        <button @click="deleteTodo(todo)" class="danger">
          Delete
        </button>
      </div>
    </div>
    
    <!-- Pagination -->
    <div class="pagination">
      <button @click="prevPage" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }}</span>
      <button @click="nextPage">Next</button>
    </div>
    
    <!-- Add new todo form -->
    <form @submit.prevent="addTodo" class="add-form">
      <input v-model="newTodo.title" placeholder="Todo title" required />
      <textarea v-model="newTodo.description" placeholder="Description"></textarea>
      <select v-model="newTodo.category">
        <option value="">No Category</option>
        <option v-for="cat in categories.fetch()" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
      <input v-model.number="newTodo.priority" type="number" min="1" max="10" placeholder="Priority" />
      <button type="submit" :disabled="!newTodo.title">Add Todo</button>
    </form>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useQueryset } from '@statezero/core/vue';
import { Todo, Category } from '../models';

export default {
  name: 'TodoList',
  setup() {
    // Reactive state
    const searchQuery = ref('');
    const selectedCategory = ref('');
    const currentPage = ref(1);
    const pageSize = ref(10);
    const newTodo = ref({
      title: '',
      description: '',
      category: '',
      priority: 5
    });
    
    // Reactive querysets (like Django QuerySets but reactive)
    const todos = useQueryset(() => {
      let query = Todo.objects.all();
      
      // Apply search filter
      if (searchQuery.value) {
        query = query.filter({ 
          title__icontains: searchQuery.value 
        });
      }
      
      // Apply category filter
      if (selectedCategory.value) {
        query = query.filter({ 
          category: selectedCategory.value 
        });
      }
      
      return query.orderBy('-created_at', '-priority');
    });
    
    const categories = useQueryset(() => {
      return Category.objects.all().orderBy('name');
    });
    
    const completedTodos = useQueryset(() => {
      return Todo.objects.filter({ completed: true });
    });
    
    const highPriorityTodos = useQueryset(() => {
      return Todo.objects.filter({ priority__gte: 8 });
    });
    
    // Computed values (for UI calculations, NOT for filtering)
    const completedCount = computed(() => completedTodos.value.count());
    
    const paginatedTodos = computed(() => {
      const offset = (currentPage.value - 1) * pageSize.value;
      return todos.value.fetch({ 
        limit: pageSize.value, 
        offset: offset,
        depth: 1  // Include related objects
      });
    });
    
    // ✅ CORRECT - Computed for display logic only, not filtering
    const todosWithDisplayInfo = computed(() => 
      todos.value.fetch().map(todo => ({
        ...todo,
        isOverdue: todo.due_date && new Date(todo.due_date) < new Date(),
        priorityColor: getPriorityColor(todo.priority), // Additional display logic
        timeAgo: getTimeAgo(todo.created_at)
      }))
    );
    
    // 🚫 WRONG - Don't use computed for filtering (use database queries instead)
    // const highPriorityTodos = computed(() => 
    //   todos.value.fetch().filter(todo => todo.priority > 5) // WRONG - inefficient
    // );
    
    // Action handlers - choose await based on whether you need confirmation
    const addTodo = async () => {
      try {
        // Using await because we want to ensure creation succeeded before clearing form
        const newTodo = await Todo.objects.create({
          title: newTodo.value.title,
          description: newTodo.value.description,
          category: newTodo.value.category || null,
          priority: newTodo.value.priority,
          completed: false
        });
        
        // Only clear form after confirmed creation
        newTodo.value = {
          title: '',
          description: '',
          category: '',
          priority: 5
        };
        
        console.log('Successfully created todo:', newTodo.id);
        
      } catch (error) {
        console.error('Failed to create todo:', error);
        alert('Failed to create todo. Please try again.');
      }
    };
    
    const toggleComplete = async (todo) => {
      try {
        // Using await to ensure the update succeeded before showing success
        await todo.update({ completed: !todo.completed });
        console.log('Todo updated successfully');
      } catch (error) {
        console.error('Failed to update todo:', error);
        // Could revert optimistic update here if needed
      }
    };
    
    // Alternative optimistic approach (immediate UI response)
    const toggleCompleteOptimistic = (todo) => {
      // No await - UI updates immediately, confirms in background
      todo.update({ completed: !todo.completed });
      // UI feels faster, but no error handling for failures
    };
    
    const updatePriority = async (todo, newPriority) => {
      if (newPriority < 1 || newPriority > 10) return;
      
      try {
        await todo.update({ priority: newPriority });
      } catch (error) {
        console.error('Failed to update priority:', error);
      }
    };
    
    const deleteTodo = async (todo) => {
      if (!confirm(`Delete "${todo.title}"?`)) return;
      
      try {
        await todo.delete();
        // UI updates automatically
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
    };
    
    // Pagination handlers
    const nextPage = () => {
      currentPage.value++;
    };
    
    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
      }
    };
    
    // Utility functions
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString();
    };
    
    return {
      // State
      searchQuery,
      selectedCategory,
      currentPage,
      newTodo,
      
      // Reactive data
      todos,
      categories,
      completedCount,
      highPriorityTodos,
      paginatedTodos,
      
      // Actions
      addTodo,
      toggleComplete,
      updatePriority,
      deleteTodo,
      nextPage,
      prevPage,
      formatDate
    };
  }
};
</script>
```

## 📁 File Handling

StateZero supports file uploads and downloads through the file handling system:

### File Uploads
```javascript
// Single file upload
const handleFileUpload = async (file) => {
  try {
    const attachment = await TodoAttachment.objects.create({
      todo: todoId,
      file: file,  // Pass File object directly
      name: file.name,
      description: 'Uploaded attachment'
    });
    console.log('File uploaded:', attachment.file_url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// Multiple file uploads
const handleMultipleUploads = async (files) => {
  const uploads = files.map(file => 
    TodoAttachment.objects.create({
      todo: todoId,
      file: file,
      name: file.name
    })
  );
  
  const results = await Promise.all(uploads);
  console.log('All files uploaded:', results);
};
```

### File Downloads and Access
```javascript
// Access file URLs
const attachments = useQueryset(() => 
  TodoAttachment.objects.filter({ todo: todoId })
);

// In template - direct URL access
// <img :src="attachment.file_url" v-if="attachment.file_url" />
// <a :href="attachment.file_url" download>{{ attachment.name }}</a>

// Programmatic download
const downloadFile = async (attachment) => {
  if (attachment.file_url) {
    window.open(attachment.file_url, '_blank');
  }
};
```

### File Input Handling (Vue)
```vue
<template>
  <div>
    <!-- Single file input -->
    <input 
      type="file" 
      @change="handleSingleFile"
      accept="image/*,.pdf,.doc,.docx"
    />
    
    <!-- Multiple file input -->
    <input 
      type="file" 
      multiple
      @change="handleMultipleFiles"
    />
    
    <!-- Drag and drop area -->
    <div 
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
      class="drop-zone"
    >
      Drop files here or click to upload
    </div>
  </div>
</template>

<script>
export default {
  setup() {
    const handleSingleFile = (event) => {
      const file = event.target.files[0];
      if (file) {
        uploadFile(file);
      }
    };
    
    const handleMultipleFiles = (event) => {
      const files = Array.from(event.target.files);
      uploadMultipleFiles(files);
    };
    
    const handleDrop = (event) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      uploadMultipleFiles(files);
    };
    
    return {
      handleSingleFile,
      handleMultipleFiles,
      handleDrop
    };
  }
};
</script>
```

## 🔒 Permissions and Security

**CRITICAL: All data permissions are defined in the backend Django code and cannot be modified from the frontend.**

```python
# Backend permissions (Django) - NOT modifiable from frontend
from statezero.adaptors.django.permissions import IsAuthenticatedPermission
from statezero.core.config import ModelConfig

registry.register(
    Todo,
    ModelConfig(
        model=Todo,
        permissions=[IsAuthenticatedPermission],  # Backend controls access
        fields={"title", "description", "completed"}  # Backend controls visible fields
    ),
)
```

### Frontend Permission Behavior
```javascript
// ✅ Frontend queries respect backend permissions automatically
const todos = useQueryset(() => Todo.objects.all()); 
// Only returns todos the current user can access (backend enforced)

// ✅ CRUD operations respect backend permissions
try {
  await Todo.objects.create({ title: 'New Todo' });
} catch (error) {
  if (error.status === 403) {
    console.log('Permission denied by backend');
  }
}

// ❌ You CANNOT bypass permissions from frontend
// All security is enforced on the backend
```

### Permission Error Handling
```javascript
const handleCreate = async (data) => {
  try {
    await Todo.objects.create(data);
  } catch (error) {
    switch (error.status) {
      case 401:
        console.log('User not authenticated');
        // Redirect to login
        break;
      case 403:
        console.log('Permission denied');
        // Show permission error message
        break;
      case 400:
        console.log('Validation error:', error.data);
        // Show field validation errors
        break;
      default:
        console.log('Server error:', error);
    }
  }
};
```

## 🔥 Advanced Patterns
```javascript
// Backend defines 'urgent_todos' queryset
const urgentTodos = useQueryset(() => {
  return Todo.objects.customQueryset('urgent_todos');
});

// Chain with other filters
const urgentWorkTodos = useQueryset(() => {
  return Todo.objects
    .customQueryset('urgent_todos')
    .filter({ category__name: 'Work' });
});
```

### Bulk Operations (Choose await based on confirmation needs)
```javascript
// Confirmed bulk operation (wait for server)
const markAllComplete = async () => {
  const count = await Todo.objects
    .filter({ completed: false })
    .update({ completed: true });
  
  console.log(`Confirmed: marked ${count} todos as complete`);
};

// Optimistic bulk operation (immediate UI update)
const markAllCompleteOptimistic = () => {
  Todo.objects
    .filter({ completed: false })
    .update({ completed: true }); // No await - immediate UI response
};

const deleteCompleted = async () => {
  if (!confirm('Delete all completed todos?')) return;
  
  // Using await because deletion is critical to confirm
  const count = await Todo.objects
    .filter({ completed: true })
    .delete();
    
  console.log(`Confirmed: deleted ${count} todos`);
};
```

### Complex Filtering with F Expressions
```javascript
import { F, or } from '@statezero/core';

// Complex query combining F expressions, OR logic, and field lookups
const complexQuery = useQueryset(() => {
  return Todo.objects
    .filter({
      completed: false,
      priority__gte: F('category__min_priority'),  // F expression + relationship
      ...or(
        { due_date__lt: new Date() },              // Overdue
        { priority__gte: 8 }                      // High priority
      )
    })
    .exclude({ 
      title__icontains: 'draft',
      created_at__lt: F('updated_at')              // F expression in exclude
    })
    .orderBy(F('priority') * F('urgency_multiplier'), '-created_at');
});

// Update with calculations
const adjustPriorities = async () => {
  await Todo.objects
    .filter({ category__name: 'Work' })
    .update({
      priority: F('priority') * 1.2,              // Increase by 20%
      adjusted_score: F('priority') + F('urgency') // Combine fields
    });
};
```

## ⚡ Performance Best Practices

1. **Use reactive queries for UI** - They update automatically and efficiently
2. **Filter at database level** - Always use `Todo.objects.filter()`, not local JavaScript filtering  
3. **Avoid array spreading** - Never use `[...todos.value.fetch()]` - breaks reactivity
4. **Chain filters before fetching** - More efficient than multiple queries
5. **Use specific field lookups** - `title__icontains` is better than broad search
6. **Leverage F expressions** - Database-level calculations are faster than JavaScript
7. **Control serialization depth** - Use `fetch({ depth: 1 })` to include relations
8. **Implement pagination** - Always use `limit` and `offset` for large datasets
9. **Leverage bulk operations** - Update many records with single query
10. **Use computed only for display logic** - Not for filtering data
11. **Handle file uploads efficiently** - Use direct File objects, not base64
12. **Respect backend permissions** - Don't try to bypass security (won't work anyway)

## 🔍 Filtering Behavior (Django-style)

**Default AND Logic:**
```javascript
// Multiple conditions are joined with AND (default Django behavior)
Todo.objects.filter({
  completed: false,
  priority__gte: 5,
  category__name: 'Work'
}); 
// SQL: WHERE completed = false AND priority >= 5 AND category.name = 'Work'
```

**OR Logic (use OR operator):**
```javascript
import { or } from '@statezero/core';

// For OR conditions, use the or() operator
Todo.objects.filter(
  or(
    { priority__gte: 8 },
    { due_date__lt: new Date() }
  )
);
// SQL: WHERE (priority >= 8 OR due_date < now)

// Complex: AND + OR combinations
Todo.objects.filter({
  completed: false,  // AND completed = false
  ...or(            // AND (priority >= 8 OR due_date < now)
    { priority__gte: 8 },
    { due_date__lt: new Date() }
  )
});
```

## ❗ Critical Anti-Patterns to Avoid

### 🚫 Array Spreading Anti-Pattern
```javascript
// 🚫 NEVER DO THIS - Array spreading breaks reactivity
const todos = useQueryset(() => Todo.objects.all());
const todoArray = [...todos.value.fetch()]; // WRONG - loses reactivity
const filteredTodos = todoArray.filter(todo => todo.priority > 5); // WRONG

// ✅ CORRECT - Keep queries reactive, use computed for local ops
const todos = useQueryset(() => Todo.objects.filter({ priority__gt: 5 }));
const todoArray = computed(() => todos.value.fetch()); // Stays reactive
```

### 🚫 Local Filtering Anti-Pattern
```javascript
// 🚫 WRONG - Don't filter query results locally
const allTodos = useQueryset(() => Todo.objects.all());
const highPriorityTodos = computed(() => 
  allTodos.value.fetch().filter(todo => todo.priority > 5) // WRONG - inefficient
);

// ✅ CORRECT - Filter at database level
const highPriorityTodos = useQueryset(() => 
  Todo.objects.filter({ priority__gt: 5 }) // RIGHT - efficient DB query
);

// ✅ EXCEPTION - Local filtering only for additional_fields or complex computed logic
const todosWithStats = useQueryset(() => Todo.objects.all());
const todosWithCustomLogic = computed(() => 
  todosWithStats.value.fetch().map(todo => ({
    ...todo,
    isUrgent: todo.priority > 7 && todo.due_date < new Date(), // Custom logic OK
    displayColor: getColorForPriority(todo.priority) // Additional fields OK
  }))
);
```

### 🚫 Other Common Mistakes
```javascript
// 🚫 DON'T: Await in reactive contexts
export default {
  async setup() {  // Wrong - setup shouldn't be async
    const todos = await Todo.objects.all().fetch(); // Wrong
    return { todos };
  }
};

// 🚫 DON'T: Manual array management when reactive queries exist
const todos = ref([]);
const loadTodos = async () => {
  todos.value = await Todo.objects.all().fetch(); // Unnecessary
};

// 🚫 DON'T: Forget to handle relationships properly
Todo.objects.filter({ category: 'Work' }); // Wrong - should be category.id or category__name

// ✅ DO: Use reactive queries and proper lookups
const todos = useQueryset(() => Todo.objects.filter({ category__name: 'Work' }));
```

## 🎯 Summary: LLM Decision Guide

| Scenario | Pattern | Example |
|----------|---------|---------|
| **OPTIMISTIC (immediate UI)** | | |
| Display reactive list | `useQueryset()` | `const todos = useQueryset(() => Todo.objects.all())` |
| Display reactive count | `useQueryset()` + `.count()` | `{{ todos.count() }}` |
| Fast user actions | No await | `todo.update({ completed: true })` |
| **CONFIRMED (wait for server)** | | |
| Critical data verification | `await .fetch()` | `const current = await Todo.objects.get({ id }).fetch()` |
| Form submission with validation | `await .create()` | `await Todo.objects.create(data)` |
| Important updates | `await .update()` | `await todo.update(changes)` |
| Destructive actions | `await .delete()` | `await todo.delete()` |
| Bulk operations | `await queryset.update()` | `await Todo.objects.filter(...).update(...)` |
| **BOTH PATTERNS** | | |
| Filter data | Database query | `Todo.objects.filter({ priority__gt: 5 })` |
| OR conditions | `or()` operator | `Todo.objects.filter(or({ a: 1 }, { b: 2 }))` |
| Field calculations | F expressions | `Todo.objects.filter({ total: F('price') * F('qty') })` |
| File operations | Direct File objects | `Model.objects.create({ file: fileObject })` |
| Display logic | `computed()` | `computed(() => todos.value.fetch().map(addDisplayProps))` |
| Permissions | Backend enforced | All security handled by Django backend |

**Decision Rules:** 
- **Need immediate UI response?** → Don't await (optimistic)
- **Need to confirm before proceeding?** → Use await (confirmed)
- **Critical operations (delete, payment, etc.)?** → Use await
- **Want fastest user experience?** → Don't await
