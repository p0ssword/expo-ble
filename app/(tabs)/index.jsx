import { Button, FlatList, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Buffer } from '@craftzdog/react-native-buffer';
import requestPermissions from '@/hooks/blePermissions';
import bleManager from 'react-native-ble-manager';

export default function BleManagerPage() {
  const [peripherals, setPeripherals] = useState(new Map());
  const [isConnect, setIsConnect] = useState(false);
  const [peripheralData, setPeripheralData] = useState(null);
  const [connectDevice, setConnectDevice] = useState(null);

  useEffect(() => {
    // 权限申请
    const blePermission = requestPermissions();
    if (!blePermission) return console.log('[ERROR CODE](16) 获取权限被拒绝');

    // 权限申请通过
    try {
      // 激活蓝牙, 即让用户开启蓝牙
      bleManager
        .enableBluetooth()
        .then((_) => {
          console.log('[DEBUG CODE](21) 蓝牙已开启');
        })
        .catch((err) => {
          console.log('[ERROR CODE](21) 蓝牙激活错误: ', err);
        });

      // 初始化蓝牙模块
      bleManager
        .start({ showAlert: false })
        .then(() => {
          console.log('[DEBUG CODE](20) 蓝牙初始化成功');
        })
        .catch((err) => {
          console.error('[ERROR CODE](22) 蓝牙初始化错误: ', err);
        });
    } catch (err) {
      console.log('[ERROR CODE](25) 蓝牙初始化错误: ', err);
    }

    // 创建监听器
    const listeners = [
      // 蓝牙状态监听
      bleManager.addListener('BleManagerDidUpdateState', (state) => {
        /*
                 共4种状态：turning_off, off, turning_on, on
                 */
        console.log('[DEBUG CODE](32) 蓝牙状态发生变化: ', state);
      }),

      // 扫描蓝牙设备
      bleManager.addListener('BleManagerDiscoverPeripheral', (peripheral) => {
        console.log('[DEBUG CODE](40) 发现设备: ', JSON.stringify(peripheral));
        // 可在此处对扫描到的设备进行保存等处理...
        setPeripherals((map) => {
          return new Map(map.set(peripheral.id, peripheral));
        });
      }),

      // 停止扫描设备
      bleManager.addListener('BleManagerStopScan', (event) => {
        console.log('[DEBUG CODE](49) 停止扫描: ', event);

        // 获取扫描到的所有的设备
        bleManager.getDiscoveredPeripherals().then((peripherals) => {
          console.log('[DEBUG CODE](54) 获取到的设备: ', JSON.stringify(peripherals));
        });
      }),

      // 连接设备
      bleManager.addListener('BleManagerConnectPeripheral', (event) => {
        console.log('[DEBUG CODE](66) 已连接设备: ', event);
        setIsConnect(true);
        setConnectDevice(event);
      }),

      // 断开连接
      bleManager.addListener('BleManagerDisconnectPeripheral', (event) => {
        console.log('[DEBUG CODE](71) 断开连接: ', event);
        setIsConnect(false);
        setPeripheralData(null);
      }),
    ];

    return () => {
      for (const listenersKey in listeners) {
        listeners[listenersKey].remove();
      }
    };
  }, []);

  /**
   * 扫描蓝牙设备
   */
  const handlerScanBle = () => {
    setPeripherals(new Map());
    try {
      bleManager.scan([], 3, false).then((_) => {
        console.log('[DEBUG CODE](57) 开启扫描');
      });
    } catch (err) {
      console.log('[ERROR CODE](58) 扫描蓝牙错误: ', err);
    }
  };

  /**
   *  连接设备
   */
  const handlerConnectPeripheral = async (item) => {
    try {
      // 连接蓝牙设备
      if (!isConnect) {
        console.log('[DEBUG CODE](89) 正在连接: ', item);
        await bleManager.connect(item.id);
      }

      // 获取设备的服务
      const peripheralServices = await bleManager.retrieveServices(item.id);
      console.log('[DEBUG CODE](110) 发现服务:', JSON.stringify(peripheralServices));

      // 筛出设备服务
      const characteristicsWithMatchingService = peripheralServices.characteristics.slice().map((t) => {
        const temp = {
          service: t.service,
          characteristic: t.characteristic,
          properties: Object.keys(t.properties),
        };
        if (t.descriptors && t.descriptors > 0) temp.descriptors = t.descriptors;
        return temp;
      });

      setPeripheralData(characteristicsWithMatchingService);
      console.log('[DEBUG CODE] 123 设备服务: ', characteristicsWithMatchingService);
    } catch (err) {
      console.log('[ERROR CODE](93) 连接错误: ', err);
    }
  };

  /**
   * 处理服务
   */
  const handleService = (item, t) => {
    // pid: 设备MAC id, characteristic: 特征id, service: 服务id
    const pid = connectDevice.peripheral;
    const { characteristic, service } = item;
    console.log(t, pid, characteristic, service);
    switch (t) {
      case 'Read':
        // 读取服务
        bleManager
          .read(pid, service, characteristic)
          .then((data) => {
            const buffer = Buffer.from(data);
            const stringData = buffer.toString();
            console.log('[DEBUG CODE](145) 读取服务: ', stringData);
          })
          .catch((err) => {
            console.log('[ERROR CODE](148) 读取失败: ', err);
          });
        break;
      case 'Write':
        // 写入服务

        // 根据官方文档提示, 将要传输数据进行转换为数字数组(Number[]), 并将数据使用Buffer.toJSON().data转换
        // 这里使用时间代替, 相关的数据格式请根据实际项目进行处理
        const data = new Date().getTime();

        // 使用TextEncoder进行编码, 再将数据传输到Buffer.from()进行转换为数字数组
        const dataBuffer = Buffer.from(new TextEncoder().encode(data));

        bleManager
          .write(pid, service, characteristic, dataBuffer.toJSON().data)
          .then(() => {
            console.log('[DEBUG CODE](159) 写入成功');
          })
          .catch((err) => {
            console.log('[ERROR CODE](162) 写入失败: ', err);
          });
        break;
      default:
        console.log('NOTHING HERE');
        break;
    }
  };

  /**
   * renderItem
   */
  const renderItem = ({ item }) => {
    return (
      <TouchableHighlight
        style={{
          padding: 10,
          marginBottom: 12,
          backgroundColor: '#efefff',
        }}
        onPress={() => {
          handlerConnectPeripheral(item);
        }}
      >
        <View>
          <Text>{item.name ?? 'NoName'}</Text>
          <Text>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  return (
    <View style={[styles.container, { marginTop: useSafeAreaInsets().top }]}>
      <Text>BleManager</Text>
      <Button title={'开始扫描'} onPress={handlerScanBle} />
      <Button
        title={'断开蓝牙'}
        onPress={() => {
          bleManager.disconnect(connectDevice.peripheral);
        }}
        disabled={!isConnect}
      />

      {!isConnect ? (
        <FlatList style={{ flex: 1 }} data={Array.from(peripherals.values())} renderItem={renderItem} />
      ) : (
        <FlatList
          data={peripheralData}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={[styles.view, { marginBottom: 10, backgroundColor: '#c0c0c4' }]} key={index}>
              <Text>{item.characteristic}</Text>
              {item.properties.map((t, i) => (
                <Button
                  title={t}
                  onPress={() => {
                    handleService(item, t);
                  }}
                  styles={{
                    backgroundColor: '#67dc5e',
                    color: '#fcfcfc',
                  }}
                  key={i}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
