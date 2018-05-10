$(function() {

  var Todo = {
    init: function(data) {
      this.title = data.title;
      this.day = data.day;
      this.month = data.month;
      this.year = data.year;
      this.dueDate = data.dueDate;
      this.description = data.description;
      this.completed = data.completed || false;
      this.id = data.id || todoCounter();
      
      return this;
    },
    addToList: function() {
      Todos.list[this.id] = this;
    },
    categorizeByMonth: function() {
      var month = TodoMonths.list[this.getDateKey()];

      month ? month.ids.push(this.id) : TodoMonths.createObject(this).addToList();
    },
    deleteTodo: function() {
      this.removeFromMonth();
      delete Todos.list[this.id];
    },
    getDateKey: function() {
      if (!this.dueDate) {
        return "No Due Date";
      } else {
        return this.dueDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-01');
      }
    },
    removeFromMonth: function() {
      var month = TodoMonths.list[this.getDateKey()];

      if (month.ids.length === 1) {
        delete TodoMonths.list[this.getDateKey()];
        return;
      }

      var idIndex = month.ids.indexOf(this.id);
      TodoMonths.list[this.getDateKey()].ids.splice(idIndex, 1);
    },
    toggleState: function() {
      this.completed = !this.completed;
    },
    updateTodo: function(todoInfo) {
      this.removeFromMonth();
      this.updateTodoInfo(todoInfo);
      this.categorizeByMonth();
    },
    updateTodoInfo: function(todoInfo) {
      return Object.assign(this, todoInfo);
    },
  };

  var Todos = {
    list: {},
    count: function() {
      return Object.values(this.list).length;
    },
    completed: function() {
      return Object.values(this.list).reduce(function(acc, todo) {
        if (todo.completed) { acc.push(todo); }
        return acc;
      }, []);
    },
    createObject: function(todoInfo) {
      return Object.create(Todo).init(todoInfo);
    },
    createNewTodo: function(todoInfo) {
      var todo = this.createObject(todoInfo);
      todo.addToList();
      todo.categorizeByMonth();
    },
    getTodos: function() {
      return Object.values(this.list);
    },
    loadList: function() {
      this.list = JSON.parse(localStorage.getItem('todosList')) || {};
      var todoObjects = Object.values(this.list);
      if (todoObjects) { this.loadTodosFromObjects(todoObjects); }
    },
    loadTodosFromObjects: function(todoObjects) {
      todoObjects.forEach(function(todoInfo) {
        var todo = this.createObject(todoInfo);
        todo.addToList();
      }.bind(this));
    },
    notCompleted: function() {
      return Object.values(this.list).reduce(function(acc, todo) {
        if (!todo.completed) { acc.push(todo); }
        return acc;
      }, []);
    },
    saveToLocalStore: function() {
      window.localStorage.setItem('todosList', JSON.stringify(Todos.list));
    },
  };

  var TodoMonth = {
    init: function(data) {
      if (Todo.isPrototypeOf(data)) {
        this.ids = [data.id];
        this.dateKey = data.getDateKey();
      } else {
        this.ids = data.ids;
        this.dateKey = data.dateKey;
      }
      return this;
    },
    addToList: function() {
      TodoMonths.list[this.dateKey] = this;
    },
    getDateKey: function() {
      var dateObj = new Date(this.dateKey + 'T08:00:00');

      if (isNaN(dateObj.getTime())) { return this.dateKey; }

      var year = String(dateObj.getFullYear()).slice(2, 4);
      var month = dateObj.getMonth() + 1;

      return month + '/' + year;
    },
    getTodos: function(months) {
      return this.ids.reduce(function(acc, id) {
        acc.push(Todos.list[id]);
        return acc;
      }, []);
    },
    completed: function() {
      return this.ids.reduce(function(acc, id) {
        if (Todos.list[id].completed) { acc.push(Todos.list[id]); }
        return acc;
      }, []);
    },
    notCompleted: function() {
      return this.ids.reduce(function(acc, id) {
        if (!Todos.list[id].completed) { acc.push(Todos.list[id]); }
        return acc;
      }, []);
    }
  };

  var TodoMonths = {
    list: {},
    createObject: function(monthInfo) {
      return Object.create(TodoMonth).init(monthInfo);
    },
    loadList: function() {
      this.list = JSON.parse(localStorage.getItem('monthsList')) || {};

      var monthObjects = Object.values(this.list);
      if (monthObjects) { this.loadMonthsFromObjects(monthObjects); }
    },
    loadMonthsFromObjects: function(monthObjects) {
      monthObjects.forEach(function(monthInfo) {
        var month = this.createObject(monthInfo);
        month.addToList();
      }.bind(this));
    },
    saveToLocalStore: function() {
      window.localStorage.setItem('monthsList', JSON.stringify(TodoMonths.list));
    },
    withCompletedTodos: function() {
      return Object.values(this.list).filter(function(month) {
        return month.completed().length;
      });
    }
  };

  function idCounter() {
    var id = 0;

    return function() {
      return id += 1;
    };
  }

  todoCounter = idCounter();

  var templates = {};

  var App = {
    init: function() {
      this.createHelpers();
      this.processLocalStorage();
      this.cacheTemplates();
      this.bindEvents();
      this.initialRender();
    },
    initialRender: function() {
      window.localStorage.setItem('filterMonth', '');
      window.localStorage.setItem('filterMonthType', '');
      this.updatePageContents(Todos);
    },
    bindEvents: function() {
      $('.new-todo').on('click', this.displayModal.bind(this));
      $('.content').on('click', '.todo-title', this.displayModal.bind(this));
      $('.content').on('click', '.trash-icon', this.processDeleteTodo.bind(this));
      $('.content').on('click', '.buttons input', this.processFormSubmissions.bind(this));
      $('.content').on('click', '.todo-item-container', this.processToggleState.bind(this));
      $('.content').on('click', '.modal', this.hideModal);
      $('.all-todos-list').on('click', '.todo-month-container', this.renderTodosByMonth.bind(this));
      $('.completed-todos-list').on('click', '.todo-month-container', this.renderCompletedTodosByMonth.bind(this));
      $('.all-todos-heading').on('click', this.renderAllTodos.bind(this));
      $('.completed-todos-heading').on('click', this.renderAllCompletedTodos.bind(this));
      $('.navigation').on('click', '.all-todos, .completed-todos, .todo-month-container', this.processTodoGroupClick.bind(this));
    },
    cacheTemplates: function() {
      $("script[type='text/x-handlebars']").each(function() {
        var $template = $(this);
        templates[$template.attr('id')] = Handlebars.compile($template.html());
      });

      $("script[data-type='partial']").each(function() {
        var $partial = $(this);
        Handlebars.registerPartial($partial.attr('id'), $partial.html());
      });
    },
    createHelpers: function() {
      Handlebars.registerHelper('formatDateMonthYear', function(dateKey) {
        var dateObj = new Date(dateKey + 'T08:00:00');

        if (isNaN(dateObj.getTime())) { return dateKey; }

        var year = String(dateObj.getFullYear()).slice(2, 4);
        var month = dateObj.getMonth() + 1;

        return month + '/' + year;
      });

      Handlebars.registerHelper('todosCountByMonth', function(ids) {
        return ids.length;
      });

      Handlebars.registerHelper('todosCompletedByMonth', function(dateKey) {
        return TodoMonths.list[dateKey].completed().length;
      });

      Handlebars.registerHelper('selectedGroupAll', function(todoGroup) {
        var filterMonth = window.localStorage.getItem('filterMonth');
        var filterMonthType = window.localStorage.getItem('filterMonthType');
        if (todoGroup.dateKey === filterMonth && filterMonthType === 'all') {
          return true;
        }
        return false;
      });

      Handlebars.registerHelper('selectedGroupCompleted', function(todoGroup) {
        var filterMonth = window.localStorage.getItem('filterMonth');
        var filterMonthType = window.localStorage.getItem('filterMonthType');
        if (todoGroup.dateKey === filterMonth && filterMonthType === 'completed') {
          return true;
        }
        return false;
      });
    },
    displayModal: function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $modalContent = $('.modal-content');
      var id = this.getTodoId(e, 'tr');

      $('.modal').removeClass('hide');
      $modalContent.removeClass('hide');

      if (id) {
        $modalContent.html(templates.todoForm(Todos.list[id]));
      } else {
        $modalContent.html(templates.todoForm());
      }

    },
    formatInputs: function(formData) {
      var data = formData.reduce(function(acc, input) {
        acc[input.name] = input.value;
        return acc;
      }, {});

      if ((data.year && data.month && data.day)) {
        data.dueDate = data.year + '-' + data.month + '-' + data.day;
      } else {
        data.dueDate = 'No Due Date';
      }

      return data;
    },
    getSelectedMonth: function(e) {
      var dateKey = $(e.currentTarget).data('date-key');
      return TodoMonths.list[dateKey];
    },
    getTodoId: function(e, selector) {
      return $(e.currentTarget).closest(selector).data('todo-id');
    },
    hideModal: function(e) {
      if (e) { e.preventDefault(); }

      $('.modal').addClass('hide');
      $('.modal-content').addClass('hide');
    },
    processFormSubmissions: function(e) {
      e.preventDefault();
      var $form = $(e.currentTarget).closest('form');
      var id = $form.data('todo-id');
      var buttonType = $(e.currentTarget).attr('class');

      if (buttonType === 'mark-complete' && !id) {
        alert("Create a todo before marking complete");
        return;
      }

      var todoInfo = this.formatInputs(($form).serializeArray());

      if (buttonType === 'create-todo') {
        this.processTodoInfo(id, todoInfo, false);
      }
      else if (buttonType === 'mark-complete') {
        todoInfo.completed = true;
        this.processTodoInfo(id, todoInfo, true);
      }
    },
    processDeleteTodo: function(e) {
      e.preventDefault();
      var id = this.getTodoId(e, 'tr');
      var filterMonth = window.localStorage.getItem('filterMonth');

      Todos.list[id].deleteTodo();
      $(e.currentTarget).closest('tr').remove();

      var todosGroup = filterMonth ? TodoMonths.list[filterMonth] : Todos;
      var headingText = todosGroup ? todosGroup.getTodos().length : '0';

      this.saveToLocalStore();
      this.renderNavTodos();

      this.updateMainTodosCount(headingText);
      this.updateNavAllTodosCount(Todos.getTodos().length);
      this.updateNavCompletedTodosCount(Todos.completed().length);
    },
    processLocalStorage: function() {
      Todos.loadList();
      TodoMonths.loadList();
    },
    processTodoInfo: function(id, todoInfo, markComplete) {
      id ? Todos.list[id].updateTodo(todoInfo) : Todos.createNewTodo(todoInfo);
      var filterMonth = window.localStorage.getItem('filterMonth');

      this.saveToLocalStore();
      this.hideModal();

      this.updatePageContents(Todos);
      this.updateMainTodosHeading('All todos');

      if (!markComplete) { this.styleActiveGroup('.all-todos'); }
    },
    processToggleState: function(e) {
      e.preventDefault();
      var id = this.getTodoId(e, 'tr');
      var filterMonth = window.localStorage.getItem('filterMonth');
      var filterMonthType = window.localStorage.getItem('filterMonthType');
      var todosGroup = filterMonth ? TodoMonths.list[filterMonth] : Todos;

      Todos.list[id].toggleState();
      this.saveToLocalStore();

      if (filterMonthType !== 'completed') {
        this.updatePageContents(todosGroup);
        return;
      }

      this.renderMainCompletedTodos(todosGroup);
      this.renderNavTodos();

      this.updateMainTodosCount(todosGroup.completed().length);
      this.updateNavAllTodosCount(Todos.getTodos().length);
      this.updateNavCompletedTodosCount(Todos.completed().length);
    },
    styleActiveGroup: function(element) {
      $('.todo-month-container, .all-todos, .completed-todos').removeClass('active-todo-group');
      $(element).addClass('active-todo-group');
    },
    renderAllTodos: function(e) {
      e.preventDefault();
      window.localStorage.setItem('filterMonth', '');

      this.renderMainTodos(Todos);

      this.updateMainTodosHeading('All todos');
      this.updateMainTodosCount(Todos.getTodos().length)
    },
    renderMainTodos: function(todosGroup) {
      this.renderMainIncompleteTodos(todosGroup);
      this.renderMainCompletedTodos(todosGroup);
    },
    renderMainCompletedTodos: function(todosGroup) {
      var completedTodos = todosGroup ? todosGroup.completed() : [];

      $('.completed-todos-main').html(templates.todoItems({ todoItems: completedTodos }));
    },
    renderMainIncompleteTodos: function(todosGroup) {
      var incompleteTodos = todosGroup ? todosGroup.notCompleted() : [];

      $('.incomplete-todos-main').html(templates.todoItems({ todoItems: incompleteTodos }));
    },
    renderAllCompletedTodos: function(e) {
      e.preventDefault();
      window.localStorage.setItem('filterMonth', '');
      window.localStorage.setItem('filterMonthType', 'completed');

      this.renderMainCompletedTodos(Todos);
      this.renderMainIncompleteTodos();

      this.updateMainTodosHeading('Completed');
      this.updateMainTodosCount(Todos.completed().length);
    },
    renderNavCompletedTodos: function(e) {
      if (e) { e.preventDefault(); }

      $('.completed-todos-list').html(
        templates.navCompletedTodoMonths({ months: TodoMonths.withCompletedTodos() })
      );
    },
    renderNavTodos: function() {
      $('.all-todos-list').html
        (templates.navTodoMonths({ months: Object.values(TodoMonths.list) })
      );

      this.renderNavCompletedTodos();
    },
    renderCompletedTodosByMonth: function(e) {
      e.preventDefault();

      var selectedMonth = this.getSelectedMonth(e);
      window.localStorage.setItem('filterMonthType', 'completed');
      window.localStorage.setItem('filterMonth', selectedMonth.dateKey);

      this.updateMainTodosHeading(selectedMonth.getDateKey());
      this.updateMainTodosCount(selectedMonth.completed().length);

      this.renderMainCompletedTodos(selectedMonth);
      this.renderMainIncompleteTodos();
    },
    renderTodosByMonth: function(e) {
      e.preventDefault();

      var selectedMonth = this.getSelectedMonth(e);
      window.localStorage.setItem('filterMonthType', 'all');
      window.localStorage.setItem('filterMonth', selectedMonth.dateKey);

      this.renderMainTodos(selectedMonth);
      this.updateMainTodosHeading(selectedMonth.getDateKey());
      this.updateMainTodosCount(selectedMonth.getTodos().length);
    },
    saveToLocalStore: function() {
      Todos.saveToLocalStore();
      TodoMonths.saveToLocalStore();
    },
    processTodoGroupClick: function(e) {
      e.preventDefault();
      this.styleActiveGroup(e.currentTarget);
    },
    updateMainTodosHeading: function(headingText) {
      $('.tasks h1').text(headingText);
    },
    updateMainTodosCount: function(todosCount) {
      $('.tasks .todos-count').text(todosCount);
    },
    updateNavAllTodosCount: function(todosCount) {
      $('.all-todos .todos-count').text(todosCount);
    },
    updateNavCompletedTodosCount: function(todosCount) {
      $('.completed-todos .completed-todos-count').text(todosCount);
    },
    updatePageContents: function(todosGroup) {
      this.renderMainTodos(todosGroup);
      this.renderNavTodos();

      this.updateMainTodosCount(todosGroup.getTodos().length);
      this.updateNavAllTodosCount(Todos.getTodos().length);
      this.updateNavCompletedTodosCount(Todos.completed().length);
    }
  };

  App.init();
});
