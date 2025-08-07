import React, { useState, useEffect } from 'react';
import { Button, TimePicker, Input, List, Switch, Select, message, Modal, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, BellOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './Reminder.css';

const { Option } = Select;
const { TextArea } = Input;
const { ipcRenderer } = window.require ? window.require('electron') : {};

const Reminder = () => {
  const [reminders, setReminders] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    time: null,
    title: '',
    description: '',
    enabled: true,
    repeat: 'once',
    sound: true
  });

  useEffect(() => {
    const savedReminders = localStorage.getItem('reminders');
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    const checkReminders = setInterval(() => {
      const now = dayjs();
      reminders.forEach(reminder => {
        if (!reminder.enabled) return;

        const reminderTime = dayjs(reminder.time);
        const isSameTime = now.format('HH:mm') === reminderTime.format('HH:mm');
        
        if (isSameTime && !reminder.triggered) {
          triggerReminder(reminder);
          updateReminderTriggered(reminder.id);
        }
      });
    }, 30000);

    return () => clearInterval(checkReminders);
  }, [reminders]);

  const triggerReminder = (reminder) => {
    if (ipcRenderer) {
      ipcRenderer.send('show-notification', {
        title: reminder.title || '提醒',
        body: reminder.description || '您设置的提醒时间到了！'
      });
    }

    if (reminder.sound) {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(e => console.log('播放提醒音效失败'));
    }

    message.info(`提醒：${reminder.title}`);
  };

  const updateReminderTriggered = (id) => {
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        if (r.repeat === 'once') {
          return { ...r, triggered: true, enabled: false };
        } else {
          return { ...r, triggered: false };
        }
      }
      return r;
    }));
  };

  const showModal = (reminder = null) => {
    if (reminder) {
      setEditingReminder(reminder);
      setFormData({
        time: dayjs(reminder.time),
        title: reminder.title,
        description: reminder.description,
        enabled: reminder.enabled,
        repeat: reminder.repeat,
        sound: reminder.sound
      });
    } else {
      setEditingReminder(null);
      setFormData({
        time: null,
        title: '',
        description: '',
        enabled: true,
        repeat: 'once',
        sound: true
      });
    }
    setIsModalVisible(true);
  };

  const handleOk = () => {
    if (!formData.time || !formData.title) {
      message.error('请填写时间和标题');
      return;
    }

    const newReminder = {
      id: editingReminder ? editingReminder.id : Date.now(),
      time: formData.time.toISOString(),
      title: formData.title,
      description: formData.description,
      enabled: formData.enabled,
      repeat: formData.repeat,
      sound: formData.sound,
      triggered: false
    };

    if (editingReminder) {
      setReminders(prev => prev.map(r => r.id === editingReminder.id ? newReminder : r));
      message.success('提醒已更新');
    } else {
      setReminders(prev => [...prev, newReminder]);
      message.success('提醒已添加');
    }

    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    message.success('提醒已删除');
  };

  const toggleReminder = (id) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const getRepeatLabel = (repeat) => {
    const labels = {
      'once': '单次',
      'daily': '每天',
      'weekdays': '工作日',
      'weekend': '周末'
    };
    return labels[repeat] || '单次';
  };

  return (
    <div className="reminder-container">
      <div className="reminder-header">
        <h3><BellOutlined /> 定时提醒</h3>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
          size="small"
        >
          添加提醒
        </Button>
      </div>

      <List
        className="reminder-list"
        dataSource={reminders}
        renderItem={item => (
          <List.Item
            className={`reminder-item ${!item.enabled ? 'disabled' : ''}`}
            actions={[
              <Switch 
                checked={item.enabled} 
                onChange={() => toggleReminder(item.id)}
                size="small"
              />,
              <Button 
                icon={<EditOutlined />} 
                onClick={() => showModal(item)}
                size="small"
                type="text"
              />,
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => deleteReminder(item.id)}
                size="small"
                type="text"
              />
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span className="reminder-time">
                    {dayjs(item.time).format('HH:mm')}
                  </span>
                  <span>{item.title}</span>
                  <Tag color={item.enabled ? 'blue' : 'default'} size="small">
                    {getRepeatLabel(item.repeat)}
                  </Tag>
                </Space>
              }
              description={item.description}
            />
          </List.Item>
        )}
      />

      <Modal
        title={editingReminder ? "编辑提醒" : "添加提醒"}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={400}
      >
        <div className="reminder-form">
          <div className="form-item">
            <label>提醒时间</label>
            <TimePicker 
              value={formData.time}
              onChange={(time) => setFormData({...formData, time})}
              format="HH:mm"
              style={{ width: '100%' }}
            />
          </div>
          <div className="form-item">
            <label>标题</label>
            <Input 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="输入提醒标题"
            />
          </div>
          <div className="form-item">
            <label>描述</label>
            <TextArea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="输入提醒描述（可选）"
              rows={3}
            />
          </div>
          <div className="form-item">
            <label>重复</label>
            <Select 
              value={formData.repeat}
              onChange={(value) => setFormData({...formData, repeat: value})}
              style={{ width: '100%' }}
            >
              <Option value="once">单次</Option>
              <Option value="daily">每天</Option>
              <Option value="weekdays">工作日</Option>
              <Option value="weekend">周末</Option>
            </Select>
          </div>
          <div className="form-item">
            <label>声音提醒</label>
            <Switch 
              checked={formData.sound}
              onChange={(checked) => setFormData({...formData, sound: checked})}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reminder;