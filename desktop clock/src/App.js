import React, { useState, useEffect } from 'react';
import { Tabs, Button, Space, ConfigProvider, theme } from 'antd';
import { 
  ClockCircleOutlined, 
  BellOutlined, 
  FileTextOutlined, 
  SettingOutlined,
  MinusOutlined,
  CloseOutlined,
  PushpinOutlined
} from '@ant-design/icons';
import Clock from './components/Clock';
import Reminder from './components/Reminder';
import Memo from './components/Memo';
import Settings from './components/Settings';
import Storage from './utils/storage';
import './App.css';

const { ipcRenderer } = window.require ? window.require('electron') : {};

function App() {
  const [activeTab, setActiveTab] = useState('clock');
  const [settings, setSettings] = useState(Storage.getSettings());
  const [isPinned, setIsPinned] = useState(true);

  useEffect(() => {
    const loadedSettings = Storage.getSettings();
    setSettings(loadedSettings);
    applyTheme(loadedSettings.theme);
  }, []);

  const applyTheme = (themeName) => {
    const root = document.documentElement;
    if (themeName === 'dark') {
      root.style.setProperty('--primary-bg', 'rgba(26, 26, 46, 0.95)');
      root.style.setProperty('--secondary-bg', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.8)');
    } else if (themeName === 'light') {
      root.style.setProperty('--primary-bg', 'rgba(255, 255, 255, 0.95)');
      root.style.setProperty('--secondary-bg', 'rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', 'rgba(0, 0, 0, 0.8)');
    }
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    Storage.setSettings(newSettings);
    applyTheme(newSettings.theme);
  };

  const handleMinimize = () => {
    if (ipcRenderer) {
      ipcRenderer.send('minimize-to-tray');
    }
  };

  const handleClose = () => {
    if (ipcRenderer) {
      ipcRenderer.send('close-app');
    }
  };

  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (ipcRenderer) {
      ipcRenderer.send('toggle-always-on-top', newPinned);
    }
  };

  const tabItems = [
    {
      key: 'clock',
      label: <span><ClockCircleOutlined /> 时钟</span>,
      children: <Clock 
        format24={settings.format24}
        showDate={settings.showDate}
        showWeek={settings.showWeek}
      />
    },
    {
      key: 'reminder',
      label: <span><BellOutlined /> 提醒</span>,
      children: <Reminder />
    },
    {
      key: 'memo',
      label: <span><FileTextOutlined /> 备忘</span>,
      children: <Memo />
    },
    {
      key: 'settings',
      label: <span><SettingOutlined /> 设置</span>,
      children: <Settings onSettingsChange={handleSettingsChange} />
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: settings.theme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        }
      }}
    >
      <div className="app">
        <div className="app-header">
          <div className="app-title">Desktop Clock</div>
          <Space className="app-controls">
            <Button
              type="text"
              icon={<PushpinOutlined />}
              onClick={togglePin}
              className={isPinned ? 'pinned' : ''}
              size="small"
            />
            <Button
              type="text"
              icon={<MinusOutlined />}
              onClick={handleMinimize}
              size="small"
            />
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              onClick={handleClose}
              size="small"
            />
          </Space>
        </div>

        <div className="app-content">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="small"
            className="app-tabs"
          />
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;