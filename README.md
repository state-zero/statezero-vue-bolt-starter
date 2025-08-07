# StateZero LLM Implementation Guide

## 🎯 What is StateZero?

StateZero is a **Django ORM for JavaScript/TypeScript frontends**. Write your Django model once, then use it directly in your frontend with the exact same syntax:

- **Same QuerySet API**: `Model.objects.filter()`, `exclude()`, `orderBy()`
- **Same field lookups**: `field__contains`, `field__gt`, `field__year`
- **Same relationships**: `category__name`, `user__profile__bio`
- **Same CRUD operations**: `create()`, `update()`, `delete()`, `save()`

**Key difference**: StateZero adds **reactive/optimistic updates** for modern frontend frameworks.

---

## 🚨 LLM Decision Tree: Optimistic by Default

**DEFAULT RULE: Always use optimistic updates (no `await`) unless you absolutely need server confirmation.**

**Why optimistic?**
- ✅ **Instant user experience** - UI feels responsive and fast
- ✅ **Automatic rollback** - StateZero handles failures gracefully
- ✅ **Real-time sync** - Changes propagate to all users immediately

```javascript
// 🟢 OPTIMISTIC (DEFAULT) - UI updates immediately, feels instant
const todos = useQueryset(() => Todo.objects.filter({ active: true }));
todo.completed = true;
todo.save(); // No await - instant, reactive UI

// 🟡 CONFIRMED (RARE) - Only when you must wait for server
const todos = await Todo.objects.filter({ active: true }).fetch();
await todo.save(); // Only if you need to block until confirmed
```

**Use `await` ONLY when:**
- 🔒 Critical operations (payments, irreversible actions)
- 📋 Form validation must complete before proceeding
- 🧮 You need the server response data (like generated IDs)
- ⚠️ Failure must prevent further actions

---

## 📋 1. QUERYING DATA

### Basic Import Pattern
```javascript
import { ref, computed } from 'vue';
import { useQueryset } from '@statezero/core/vue';
import { Todo, Category } from './models'; // Auto-generated from Django
```

### Optimistic Queries (DEFAULT - Use This)
```javascript
// ✅ DEFAULT: Use for all UI display - instant and reactive
const todos = useQueryset(() => {
  let query = Todo.objects.all();
  
  if (searchQuery.value) {
    query = query.filter({ title__icontains: searchQuery.value });
  }
  
  return query.orderBy('-created_at');
});

// Use directly in templates - updates instantly
const todoList = computed(() => todos.value.fetch({ limit: 10 }));
const todoCount = computed(() => todos.value.count());
```

### Confirmed Queries (RARE - Only When Required)
```javascript
// 🟡 RARE: Only when you absolutely need confirmed server state
const handleCriticalOperation = async () => {
  // Only use await if you must have current server data
  const currentTodos = await Todo.objects.filter({ active: true }).fetch();
  // Proceed only with confirmed data
};
```

### Django-Style Field Lookups
```javascript
// Text searches
Todo.objects.filter({ title__contains: 'urgent' })
Todo.objects.filter({ title__icontains: 'URGENT' }) // Case insensitive
Todo.objects.filter({ title__startswith: 'TODO:' })

// Numbers
Todo.objects.filter({ priority__gt: 5 })
Todo.objects.filter({ priority__gte: 5 })
Todo.objects.filter({ priority__in: [1, 2, 3] })

// Dates
Todo.objects.filter({ created_at__year: 2024 })
Todo.objects.filter({ created_at__month: 6 })
Todo.objects.filter({ due_date__isnull: false })

// Relationships (double underscores)
Todo.objects.filter({ category__name: 'Work' })
Todo.objects.filter({ user__profile__department: 'Engineering' })
```

### Chaining Queries
```javascript
Todo.objects
  .filter({ completed: false })
  .exclude({ archived: true })
  .orderBy('-created_at', 'priority')
  .fetch({ limit: 10, offset: 20 })
```

---

## 📝 2. CREATING DATA

### Optimistic Create (DEFAULT - Instant UI)
```javascript
const handleAdd = (data) => {
  // DEFAULT: UI updates immediately, feels instant
  Todo.objects.create({
    title: data.title,
    completed: false,
    category: categoryId
  });
  // User sees immediate feedback, confirms in background
};
```

### Confirmed Create (RARE - When You Need Server Response)
```javascript
const handleFormSubmit = async (data) => {
  try {
    // RARE: Only when you need the server response before proceeding
    const newTodo = await Todo.objects.create({
      title: data.title,
      description: data.description,
      category: categoryId
    });
    
    // Only proceed after confirmed creation
    console.log('Created with ID:', newTodo.id);
    clearForm();
  } catch (error) {
    showError('Failed to create todo');
  }
};
```

---

## ✏️ 3. EDITING DATA

### Django-Style Instance Editing (DEFAULT - Optimistic)
```javascript
// ✅ DEFAULT: Instant UI updates, feels responsive
const editTodo = (todo) => {
  todo.title = 'Updated Title';
  todo.completed = true;
  todo.priority = 8;
  
  // DEFAULT: Optimistic save (immediate UI update)
  todo.save();
};
```

### Confirmed Save (RARE - When You Must Wait)
```javascript
// 🟡 RARE: Only when you absolutely need confirmation
const editTodoConfirmed = async (todo) => {
  todo.title = 'Updated Title';
  
  try {
    // Only use await if you must wait for server confirmation
    await todo.save();
    console.log('Confirmed saved');
  } catch (error) {
    console.log('Save failed, will retry');
  }
};
```

### QuerySet Update (Multiple Records)
```javascript
// ✅ Update via QuerySet (like Django)
await Todo.objects
  .filter({ id: todo.id })
  .update({ 
    title: 'Updated Title',
    completed: true 
  });
```

### Bulk Updates (QuerySet Update)
```javascript
// Update multiple records at once (like Django)
await Todo.objects
  .filter({ completed: false })
  .update({ completed: true });

// Update single record via QuerySet
await Todo.objects
  .filter({ id: todo.id })
  .update({ priority: 8 });
```

---

## 🗑️ 4. DELETING DATA

### Single Delete
```javascript
const deleteTodo = async (todo) => {
  if (!confirm('Delete this todo?')) return;
  
  // Destructive actions often need confirmation
  await todo.delete();
};
```

### Bulk Delete
```javascript
const deleteCompleted = async () => {
  await Todo.objects
    .filter({ completed: true })
    .delete();
};
```

---

## ⚡ 5. ACTIONS - Custom Server Functions

Actions are **type-safe async functions** that call custom server-side business logic. They're auto-generated from your backend Python functions and work like any other async function.

### Basic Usage
```javascript
import { sendWelcomeEmail, createInvoice } from '../generated-actions';

// Simple action call - just like any async function
const welcomeUser = async (userId) => {
  try {
    const result = await sendWelcomeEmail({ userId });
    console.log('Email sent!', result.status);
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
};

// Action with multiple parameters
const createUserInvoice = async (customerId, amount, isUrgent) => {
  try {
    const invoice = await createInvoice({
      customerId,
      amount,
      isUrgent
    });
    
    console.log('Invoice created:', invoice.invoiceId);
    return invoice;
  } catch (error) {
    console.error('Failed to create invoice:', error.message);
    throw error;
  }
};
```

### Actions in Vue Components
```javascript
import { sendNotification } from '../generated-actions';

const NotificationForm = {
  setup() {
    const message = ref('');
    const loading = ref(false);
    
    const handleSend = async () => {
      loading.value = true;
      try {
        await sendNotification({
          message: message.value,
          priority: 'high'
        });
        message.value = ''; // Clear form
        alert('Notification sent!');
      } catch (error) {
        alert(`Error: ${error.message}`);
      } finally {
        loading.value = false;
      }
    };
    
    return { message, loading, handleSend };
  }
};
```

### Action Key Benefits
- **No manual API calls** - Handle HTTP requests automatically
- **Full type safety** - Input/output validation and IntelliSense
- **Structured errors** - Easy to catch and handle failures
- **Permission handling** - Authentication built-in

### Generation
```bash
# Sync actions from backend
npx statezero-cli sync-actions

# Or sync everything (models + actions)
npx statezero-cli sync
```

---

## 🎨 6. COMPLETE VUE COMPONENT PATTERN

```vue
<template>
  <div>
    <!-- Search -->
    <input v-model="searchQuery" placeholder="Search todos..." />
    
    <!-- Stats -->
    <div class="stats">
      <p>Total: {{ todos.count() }}</p>
      <p>Completed: {{ completedTodos.count() }}</p>
    </div>
    
    <!-- Todo List -->
    <div v-for="todo in todoList" :key="todo.id" class="todo-item">
      <h3>{{ todo.title }}</h3>
      <p>Category: {{ todo.category?.name }}</p>
      
      <button @click="toggleComplete(todo)">
        {{ todo.completed ? 'Mark Incomplete' : 'Mark Complete' }}
      </button>
      <button @click="deleteTodo(todo)">Delete</button>
    </div>
    
    <!-- Add Form -->
    <form @submit.prevent="addTodo">
      <input v-model="newTodo.title" placeholder="Todo title" required />
      <button type="submit">Add Todo</button>
    </form>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useQueryset } from '@statezero/core/vue';
import { Todo } from './models';

export default {
  setup() {
    // State
    const searchQuery = ref('');
    const newTodo = ref({ title: '' });
    
    // Reactive queries
    const todos = useQueryset(() => {
      let query = Todo.objects.all();
      
      if (searchQuery.value) {
        query = query.filter({ title__icontains: searchQuery.value });
      }
      
      return query.orderBy('-created_at');
    });
    
    const completedTodos = useQueryset(() => {
      return Todo.objects.filter({ completed: true });
    });
    
    // Computed for display
    const todoList = computed(() => todos.value.fetch({ limit: 20 }));
    
    // Actions
    const addTodo = async () => {
      try {
        await Todo.objects.create({
          title: newTodo.value.title,
          completed: false
        });
        newTodo.value.title = '';
      } catch (error) {
        alert('Failed to create todo');
      }
    };
    
    const toggleComplete = (todo) => {
      // DEFAULT: Optimistic update - instant UI response
      todo.completed = !todo.completed;
      todo.save();
    };
    
    const deleteTodo = async (todo) => {
      if (!confirm('Delete this todo?')) return;
      // Destructive actions often use await
      await todo.delete();
    };
    
    return {
      searchQuery,
      newTodo,
      todos,
      completedTodos,
      todoList,
      addTodo,
      toggleComplete,
      deleteTodo
    };
  }
};
</script>
```

---

## 🔥 7. ADVANCED PATTERNS

### OR Queries
```javascript
import { Q } from '@statezero/core';

const urgentTodos = useQueryset(() => {
  return Todo.objects.filter({
    Q: [Q("OR", 
      { priority__gte: 8 },
      { due_date__lt: new Date() }
    )]
  });
});
```

### F Expressions (Database Calculations)
```javascript
import { F } from '@statezero/core';

// Increment a counter
Product.objects.filter({ id: 1 }).update({
  view_count: F('view_count + 1')
});
```

### File Handling
```javascript
import { FileObject } from './models/fileobject.js';

const handleFileUpload = async (file) => {
  // Create FileObject and wait for upload to complete
  const fileObj = new FileObject(file);
  await fileObj.waitForUpload();
  
  await TodoAttachment.objects.create({
    todo: todoId,
    file: fileObj.filePath, // Use the uploaded file path
    name: file.name
  });
};

// File input handling
const handleFileInput = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const fileObj = new FileObject(file);
    await fileObj.waitForUpload();
    
    // fileObj.filePath is now available for model creation
    console.log('File uploaded:', fileObj.filePath);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

---

## ❌ 8. COMMON MISTAKES TO AVOID

### Don't Break Reactivity
```javascript
// 🚫 WRONG - Breaks reactivity
const todoArray = [...todos.value.fetch()];
const filteredTodos = todoArray.filter(t => t.priority > 5);

// ✅ CORRECT - Keep reactive, filter at database level
const highPriorityTodos = useQueryset(() => 
  Todo.objects.filter({ priority__gt: 5 })
);
```

### Don't Local Filter When You Can Database Filter
```javascript
// 🚫 WRONG - Inefficient local filtering
const allTodos = useQueryset(() => Todo.objects.all());
const completedTodos = computed(() => 
  allTodos.value.fetch().filter(t => t.completed)
);

// ✅ CORRECT - Database filtering
const completedTodos = useQueryset(() => 
  Todo.objects.filter({ completed: true })
);
```

### Don't Make Setup Async
```javascript
// 🚫 WRONG
export default {
  async setup() { // Don't make setup async
    const todos = await Todo.objects.all().fetch();
    return { todos };
  }
};

// ✅ CORRECT
export default {
  setup() {
    const todos = useQueryset(() => Todo.objects.all());
    return { todos };
  }
};
```

### Share Base QuerySets for Related Queries
```javascript
// ✅ CORRECT - Chain from base queryset for clarity and optimization
const baseTodos = useQueryset(() => Todo.objects.filter({ user: currentUser.id }));

const activeTodos = useQueryset(() => 
  baseTodos.value.filter({ completed: false })
);

const completedTodos = useQueryset(() => 
  baseTodos.value.filter({ completed: true })
);

const urgentTodos = useQueryset(() => 
  baseTodos.value.filter({ priority__gte: 8 })
);

// 🚫 WRONG - Separate base queries (less clear, harder to optimize)
const activeTodos = useQueryset(() => 
  Todo.objects.filter({ user: currentUser.id, completed: false })
);

const completedTodos = useQueryset(() => 
  Todo.objects.filter({ user: currentUser.id, completed: true })
);

const urgentTodos = useQueryset(() => 
  Todo.objects.filter({ user: currentUser.id, priority__gte: 8 })
);
```

---

## 📊 9. WHEN TO USE WHAT

| Scenario | Pattern | Example |
|----------|---------|---------|
| Display data | `useQueryset()` (optimistic) | `const todos = useQueryset(() => Todo.objects.all())` |
| User interactions | No await (optimistic) | `todo.save()` |
| Form submissions | Usually no await | `Todo.objects.create(data)` |
| Custom business logic | Actions (await) | `await sendWelcomeEmail({ userId })` |
| Critical operations | Use await when required | `await payment.process()` |
| Destructive actions | Often await | `await todo.delete()` |
| Filter data | Database query | `Todo.objects.filter({ priority__gt: 5 })` |
| OR conditions | `Q` objects | `{ Q: [Q("OR", {a: 1}, {b: 2})] }` |
| Field calculations | F expressions | `F('price * quantity')` |
| Display logic only | `computed()` | `computed(() => todos.value.fetch().map(addDisplayInfo))` |

---

## 🎯 SUMMARY FOR LLMs

**StateZero = Django ORM in JavaScript + Reactivity + Custom Actions**

1. **Import models** from `./models` (auto-generated from Django)
2. **Import actions** from `./generated-actions` (auto-generated from Django)
3. **Use `useQueryset()`** for reactive data display  
4. **Django syntax works exactly the same**: `filter()`, `exclude()`, `field__contains`, etc.
5. **Edit instances Django-style**: `instance.field = value; instance.save()`
6. **Call actions like async functions**: `await sendEmail({ userId })` 
7. **DEFAULT: Use optimistic updates** (no await) for instant, responsive UI
8. **RARE: Only await when you absolutely need server confirmation** 
9. **Filter at database level**, not locally in JavaScript
10. **Use computed() only for display logic**, not data filtering

**Core pattern**: Optimistic by default + Django syntax + reactive queries + type-safe actions = fast, responsive UIs that feel instant.
