# Expo (React Native)集成蓝牙功能

作者: [p0ssword](mail:p0ssword@88.com)

编写于2024年11月04日

## 0. 附录

- 项目目录

```
├── app
|  ├── (tabs)
|  |  ├── explore.jsx
|  |  ├── index.jsx
|  |  └── _layout.jsx
|  ├── +html.jsx
|  ├── +not-found.jsx
|  └── _layout.jsx
├── app.json
├── babel.config.js
├── components
|  ├── Collapsible.jsx
|  ├── ExternalLink.jsx
|  ├── HelloWave.jsx
|  ├── navigation
|  |  └── TabBarIcon.jsx
|  ├── ParallaxScrollView.jsx
|  ├── ThemedText.jsx
|  └── ThemedView.jsx
├── constants
|  └── Colors.js
├── expo-env.d.ts
├── hooks
|  ├── useColorScheme.js
|  ├── useColorScheme.web.js
|  └── useThemeColor.js
├── jsconfig.json
├── package.json
└── README.md
```

- 所用包

  ```
  react-native-ble-manager @craftzdog/react-native-buffer expo-device
  ```

  

简单讲讲流程, 手机使用蓝牙功能进行扫描设备, 然后连接对应的设备并读取设备提供的服务, 接着使用服务进行对应的操作(CRUD)

![扫描设备](https://img.picui.cn/free/2024/11/06/672ac9fdda2e4.png)

[扫描设备]

![连接并使用设备](https://img.picui.cn/free/2024/11/06/672aca215df12.png)

[连接并使用设备]



## 1. 安装蓝牙所需的包以及进行预编译

1. 打开项目终端, 在项目中安装`react-native-ble-manager`和`@craftzdog/react-native-buffer`

   - react-native-ble-manager: 用于蓝牙通信的包
   - @craftzdog/react-native-buffer: 用于处理蓝牙通信数据处理(可选用其他包, 不一定要一样)
   - expo-device: 可访问物理设备的系统信息，如制造商和型号

   ```shell
   npx expo add react-native-ble-manager @craftzdog/react-native-buffer expo-device
   ```

2. 终端输入命令对Expo项目进行预编译, **注意: iOS平台只能在Mac电脑上进行预编译, Windows仅能预编译Android平台**

   ```shell
   npx expo prebuild
   ```

   根据实际情况进行填写内容

   ```
   $ npx expo prebuild
   
   📝  Android package Learn more: https://expo.fyi/android-package
   
   √ What would you like your Android package name to be? » #[根据实际进行填写]
   
   ✔ Created native directory
   ✔ Updated package.json
   ✔ Finished prebuild
   ```

   在预编译完成后, 即可以在项目中看到`android`或`iOS`目录

## 2. 编写代码

> [!IMPORTANT]
>
> **注意: 模拟器没有蓝牙功能, 请实际使用时, 使用真机进行测试**

本次项目为演示, 主要代码将编写在`app > index.jsx` , 实际情况请自行判断

### 0. 运行项目

```shell
npx expo run:android
```

运行之前请先**连接真机并开启adb调试**, 详情请进行互联网或者Ai查询

在终端中显示`BUILD SUCCESSFUL`则编译成功, 期间真机会弹出安装App的弹窗, 请进行确认安装

安装后则终端会自动打开App, 如图所示

![image-20241105104934340](https://img.picui.cn/free/2024/11/05/672987c1e780e.png)

### 1. 编写蓝牙权限申请的Hook函数

   #### 安卓部分

   ```js
   import { PermissionsAndroid, Platform } from 'react-native';
   import ExpoDevice from 'expo-device';
   
   /**
    * 请求 Android 31 及以上版本的蓝牙相关权限。
    * 在 Android 31 及以上版本，蓝牙扫描、连接以及位置权限是需要单独申请的。
    * 
    * @returns {Promise<boolean>} 如果所有权限都被授予，返回 true；否则返回 false。
    */
   const requestAndroid31Permissions = async () => {
     // 请求蓝牙扫描权限
     const bluetoothScanPermission = await PermissionsAndroid.request(
       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
       {
         title: "Location Permission", // 权限标题
         message: "Bluetooth Low Energy requires Location", // 权限描述
         buttonPositive: "OK", // 同意按钮文本
       }
     );
   
     // 请求蓝牙连接权限
     const bluetoothConnectPermission = await PermissionsAndroid.request(
       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
       {
         title: "Location Permission",
         message: "Bluetooth Low Energy requires Location",
         buttonPositive: "OK",
       }
     );
   
     // 请求位置权限（蓝牙扫描需要位置权限）
     const fineLocationPermission = await PermissionsAndroid.request(
       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
       {
         title: "Location Permission",
         message: "Bluetooth Low Energy requires Location",
         buttonPositive: "OK",
       }
     );
   
     // 如果三个权限都被授予，则返回 true，否则返回 false
     return (
       bluetoothScanPermission === "granted" &&
       bluetoothConnectPermission === "granted" &&
       fineLocationPermission === "granted"
     );
   };
   
   /**
    * 请求所需的权限。
    * 1. 如果是 Android 系统，且版本低于 31，则仅请求位置权限。
    * 2. 如果是 Android 31 及以上版本，额外请求蓝牙扫描和蓝牙连接权限。
    * 
    * @returns {Promise<boolean>} 如果权限申请通过，返回 true；否则返回 false。
    */
   const requestPermissions = async () => {
     // 如果是 Android 系统
     if (Platform.OS === "android") {
       // 如果 Android 版本低于 31
       if ((ExpoDevice?.platformApiLevel ?? -1) < 31) {
         // 仅请求位置权限
         const granted = await PermissionsAndroid.request(
           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
           {
             title: "Location Permission",
             message: "Bluetooth Low Energy requires Location",
             buttonPositive: "OK",
           }
         );
         // 如果位置权限被授予，返回 true
         return granted === PermissionsAndroid.RESULTS.GRANTED;
       } else {
         // 如果是 Android 31 及以上版本，请求蓝牙相关权限
         const isAndroid31PermissionsGranted =
           await requestAndroid31Permissions();
   
         // 如果所有权限都被授予，返回 true
         return isAndroid31PermissionsGranted;
       }
     } else {
       // 非 Android 系统，默认返回 true
       return true;
     }
   };
   
   // 导出权限请求函数
   export default requestPermissions;
   ```

   #### iOS部分

   iOS需要在`info.plist`声明对蓝牙的应用的场景说明, 如果不进行声明, 系统在运行时有权对权限进行拒绝

   `info.plist`文件一般在`ios > [项目名] > Supporting > Info.plist`

   ```xml
   <key>NSBluetoothPeripheralUsageDescription</key>
   <string>我们需要访问蓝牙来扫描和连接设备。</string>
   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>我们需要访问蓝牙来提供持续的设备连接。</string>
   ```

### 2. 权限获取

   使用`useEffect`进行处理蓝牙的权限获取, 当拿到权限时并进行监听蓝牙相关事件

   ```jsx
     useEffect(() => {
       // 权限申请
       const blePermission = requestPermissions();
       if (!blePermission) return console.log('获取权限被拒绝');
   
       // 权限申请通过
       // ... 
     }, []);
   ```
   ![image-20241105105036293](https://img.picui.cn/free/2024/11/05/672987ff9a9fd.png)

打开时会有权限请求, 请进行允许

### 3. 初始化蓝牙与扫描蓝牙设备

在权限获取成功后, 进行蓝牙的初始化和创建监听器

```jsx
export default function HomeScreen() {
  // 扫描到的设备
  const [peripherals, setPeripherals] useState(new Map());

  useEffect(() => {
    // 权限申请
    const blePermission = requestPermissions();
    if (!blePermission) return console.log('[ERROR CODE](16) 获取权限被拒绝');

    // 权限申请通过
    try {
      // 激活蓝牙, 即让用户开启蓝牙
      bleManager.enableBluetooth().then(_ => {console.log('[DEBUG CODE](21) 蓝牙已开启')}).catch(err => {console.log('[ERROR CODE](21) 蓝牙激活错误: ', err)});

      // 初始化蓝牙模块
      bleManager.start({showAlert: false}).then(() => {console.log('[DEBUG CODE](20) 蓝牙初始化成功')})
      .catch(err => {
        console.error('[ERROR CODE](22) 蓝牙初始化错误: ', err);
      })
    } catch (err) {
      console.log('[ERROR CODE](25) 蓝牙初始化错误: ', err)
    }

    // 创建监听器
    const listeners = [
      // 蓝牙状态监听
      bleManager.addListener('BleManagerDidUpdateState', state => {
        /*
         共4种状态：turning_off, off, turning_on, on
         */
        console.log('[DEBUG CODE](32) 蓝牙状态发生变化: ', state);
      }),

      // 扫描蓝牙设备
      bleManager.addListener('BleManagerDiscoverPeripheral', peripheral => {
        console.log('[DEBUG CODE](40) 发现设备: ', peripheral);
        // 可在此处对扫描到的设备进行保存处理...
        setPeripherals(map=>{return new Map(peripheral.id, peripheral)})
      }),

      // 停止扫描设备
      bleManager.addListener('BleManagerStopScan', event => {
        console.log('[DEBUG CODE](49) 停止扫描: ', event);

        // 获取扫描到的所有的设备
        bleManager.getDiscoveredPeripherals().then(peripherals => {
          console.log('[DEBUG CODE](54) 获取到的设备: ', JSON.stringify(peripherals));
        })
      })
    ];

    // 离开时移除监听器
    return () => {
      for (const listenersKey in listeners) {
        listeners[listenersKey].remove();
      }
    }
  }, []);

  /**
   * 扫描蓝牙设备
   */
  const handlerScanBle = () => {
    try {
      bleManager.scan([], 5, false)
      .then(_ => {console.log('[DEBUG CODE](57) 开启扫描')})
    } catch (err) {
      console.log('[ERROR CODE](58) 扫描蓝牙错误: ', err)
    }
  }

  return (
    <>
      <Button title={'扫描蓝牙'} onPress={handlerScanBle}/>
    </>
  );
}
```

解析扫描到的数据:

```json
{
  "advertising": {
    "manufacturerData": {
      "3534": {
        "bytes": [
          99,
          49,
          45,
          49,
          49,
          49,
          50,
          48,
          52,
          48,
          51,
          49,
          56,
          78
        ],
        "data": "YzEtMTExMjA0MDMxOE4=",
        "CDVType": "ArrayBuffer"
      }
    },
    "txPowerLevel": -2147483648,
    "isConnectable": true,
    "serviceData": {},
    "localName": "tcl_AC_t*ap_cabinet",
    "serviceUUIDs": [
      "f100",
      "f400"
    ],
    "manufacturerRawData": {
      "bytes": [
        0,
        0,
        53,
        52,
        99,
        49,
        45,
        49,
        49,
        49,
        50,
        48,
        52,
        48,
        51,
        49,
        56,
        78
      ],
      "data": "AAA1NGMxLTExMTIwNDAzMThO",
      "CDVType": "ArrayBuffer"
    },
    "rawData": {
      "bytes": [
        2,
        1,
        6,
        3,
        3,
        0,
        241,
        20,
        9,
        116,
        99,
        108,
        95,
        65,
        67,
        95,
        116,
        42,
        97,
        112,
        95,
        99,
        97,
        98,
        105,
        110,
        101,
        116,
        3,
        3,
        0,
        244,
        3,
        25,
        0,
        0,
        17,
        255,
        52,
        53,
        99,
        49,
        45,
        49,
        49,
        49,
        50,
        48,
        52,
        48,
        51,
        49,
        56,
        78,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      "data": "AgEGAwMA8RQJdGNsX0FDX3QqYXBfY2FiaW5ldAMDAPQDGQAAEf80NWMxLTExMTIwNDAzMThOAAAAAAAAAAA=",
      "CDVType": "ArrayBuffer"
    }
  },
  "rssi": -71,
  "id": "D0:76:02:9C:45:C2",
  "name": "tcl_AC_t*ap_cabinet"
}
```

- name: 设备名
- id: 设备蓝牙MAC地址
- rssi: 信号强度
- advertising: 蓝牙广播
  - isConnectable: 是否可以连接
  - servicesUUIDs: 服务uuid

其中, id, servicesUUIDs较为重要, 这两个参数连接时进行获取蓝牙服务

### 4. 连接蓝牙设备并获取蓝牙设备服务

当我们获取到我们要的蓝牙设备时, 可以对其进行连接并获取所提供的服务

```jsx
export default function HomeScreen() {
  // .....

  /**
   *  连接设备
   */
  const handlerConnectPeripheral = async ({item}) => {
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
      const characteristicsWithMatchingService = peripheralServices.characteristics.slice().map(t => {
        const temp = {
          service: t.service,
          characteristic: t.characteristic,
          properties: Object.keys(t.properties)
        }
        if (t.descriptors && t.descriptors > 0) temp.descriptors = t.descriptors
        return temp;
      })

      // 保存服务
      setPeripheralData(characteristicsWithMatchingService);
      console.log('[DEBUG CODE] 123 设备服务: ',characteristicsWithMatchingService);
    } catch (err) {
      console.log('[ERROR CODE](93) 连接错误: ', err);
    }
  }

  return (
    <View style={{top: useSafeAreaInsets().top}}>
      <Button title={'扫描蓝牙'} onPress={handlerScanBle}/>
      <FlatList style={{marginTop: 40}} data={Array.from(peripherals.values())} renderItem={(item) => {
        return (
          <TouchableOpacity onPress={() => {handlerConnectPeripheral({...item})}}>
            <View style={{flex: 1, marginBottom: 16, borderBottomWidth: 1}}>
              <Text>{item.item.name}</Text>
              <Text style={{fontSize: 12}}>{item.item.id}</Text>
            </View>
          </TouchableOpacity>
        );
      }}/>
    </View>
  );
}

```

当连接上蓝牙设备后, 读取对应的蓝牙服务并进行保存, 便于接下来的数据收发

### 5. 数据收发

目前仅研究了蓝牙数据的读取以及发送, `react-native-ble-manager`中还有一个`Notice`也就是通知, 但示例中并没有展示, 因为实际用途感觉不是很大

蓝牙的数据传输一般为HEX数据, 也就是16进制的数字数组, 在前文中提到的包: `@craftzdog/react-native-buffer`, 就是用来解析以及创建数据用的

下面请看函数方法

```jsx
 /**
   * 处理服务
   */
  const handleService = (item, t) => {
    // pid: 设备MAC id, characteristic: 特征id, service: 服务id, t: 服务方法
    const pid = connectDevice.peripheral;
    const {characteristic, service} = item;

    
    switch (t) {
      case 'Read':
        // 读取服务
        bleManager.read(pid, service, characteristic).then(data => {
          const buffer = Buffer.from(data);
          const stringData = buffer.toString();
          console.log('[DEBUG CODE](145) 读取服务: ', stringData);
        })
        .catch(err=>{
          console.log('[ERROR CODE](148) 读取失败: ', err)
        })
        break;
        
      case 'Write':
        // 写入服务

        // 根据官方文档提示, 将要传输数据进行转换为数字数组(Number[]), 并将数据使用Buffer.toJSON().data转换
        
        // 这里使用时间代替, 相关的数据格式请根据实际项目进行处理
        const data = new Date().getTime(); 
        
        // 使用TextEncoder进行编码, 再将数据传输到Buffer.from()进行转换为数字数组
        const dataBuffer = Buffer.from(new TextEncoder().encode(data)); 

        bleManager.write(pid, service, characteristic, dataBuffer.toJSON().data).then(()=>{
          console.log('[DEBUG CODE](159) 写入成功')
        })
        .catch(err=>{
          console.log('[ERROR CODE](162) 写入失败: ', err)
        })
        break;
        
      default:
        break;
    }
  }
```

看看示例输出

读取服务

```shell
 LOG  [DEBUG CODE](145) 读取服务:  zs-F11D
```

写入服务

```shell
 LOG  [DEBUG CODE](159) 写入成功
```

提示写入成功后, 基本就可以在蓝牙端方面进行接收数据了

```shell
写入: <Buffer 31 37 33 30 38 36 30 31 36 38 33 35 34> {
  type: 'Buffer',
  data: [
    49, 55, 51, 48, 56, 54,
    48, 49, 54, 56, 51, 53,
    52
  ]
} 1730860168354
```



#### 完整示例代码

```jsx
import {
    Button,
    Dimensions,
    FlatList,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useEffect, useState} from 'react';
import BleManager from 'react-native-ble-manager';
import {Buffer} from '@craftzdog/react-native-buffer';
import requestPermissions from '@/hooks/blePermissions';
import bleManager from 'react-native-ble-manager';

const {width: sWidth, height: sHeight} = Dimensions.get('screen');
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
            bleManager.enableBluetooth().then(_ => {
                console.log('[DEBUG CODE](21) 蓝牙已开启')
            }).catch(err => {
                console.log('[ERROR CODE](21) 蓝牙激活错误: ', err)
            });

            // 初始化蓝牙模块
            bleManager.start({showAlert: false}).then(() => {
                console.log('[DEBUG CODE](20) 蓝牙初始化成功')
            })
            .catch(err => {
                console.error('[ERROR CODE](22) 蓝牙初始化错误: ', err);
            })
        } catch (err) {
            console.log('[ERROR CODE](25) 蓝牙初始化错误: ', err)
        }

        // 创建监听器
        const listeners = [
            // 蓝牙状态监听
            bleManager.addListener('BleManagerDidUpdateState', state => {
                /*
                 共4种状态：turning_off, off, turning_on, on
                 */
                console.log('[DEBUG CODE](32) 蓝牙状态发生变化: ', state);
            }),

            // 扫描蓝牙设备
            bleManager.addListener('BleManagerDiscoverPeripheral', peripheral => {
                console.log('[DEBUG CODE](40) 发现设备: ', JSON.stringify(peripheral));
                // 可在此处对扫描到的设备进行保存等处理...
                setPeripherals(map => {
                    return new Map(map.set(peripheral.id, peripheral))
                })
            }),

            // 停止扫描设备
            bleManager.addListener('BleManagerStopScan', event => {
                console.log('[DEBUG CODE](49) 停止扫描: ', event);

                // 获取扫描到的所有的设备
                bleManager.getDiscoveredPeripherals().then(peripherals => {
                    console.log('[DEBUG CODE](54) 获取到的设备: ', JSON.stringify(peripherals));
                })
            }),

            // 连接设备
            bleManager.addListener('BleManagerConnectPeripheral', event => {
                console.log('[DEBUG CODE](66) 已连接设备: ', event);
                setIsConnect(true);
                setConnectDevice(event);
            }),

            // 断开连接
            bleManager.addListener('BleManagerDisconnectPeripheral', event => {
                console.log('[DEBUG CODE](71) 断开连接: ', event);
                setIsConnect(false);
                setPeripheralData(null)
            })
        ];

        return () => {
            for (const listenersKey in listeners) {
                listeners[listenersKey].remove();
            }
        }
    }, []);

    /**
     * 扫描蓝牙设备
     */
    const handlerScanBle = () => {
        try {
            setPeripherals(new Map());
            bleManager.scan([], 3, false)
            .then(_ => {
                console.log('[DEBUG CODE](57) 开启扫描')
            })
        } catch (err) {
            console.log('[ERROR CODE](58) 扫描蓝牙错误: ', err)
        }
    }

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
            const characteristicsWithMatchingService = peripheralServices.characteristics.slice().map(t => {
                const temp = {
                    service: t.service,
                    characteristic: t.characteristic,
                    properties: Object.keys(t.properties)
                }
                if (t.descriptors && t.descriptors > 0) temp.descriptors = t.descriptors
                return temp;
            })

            setPeripheralData(characteristicsWithMatchingService);
            console.log('[DEBUG CODE] 123 设备服务: ', characteristicsWithMatchingService);
        } catch (err) {
            console.log('[ERROR CODE](93) 连接错误: ', err);
        }
    }

    /**
     * 处理服务
     */
    const handleService = (item, t) => {
        // pid: 设备MAC id, characteristic: 特征id, service: 服务id
        const pid = connectDevice.peripheral;
        const {characteristic, service} = item;
        console.log(t, pid, characteristic, service);
        switch (t) {
            case 'Read':
                // 读取服务
                bleManager.read(pid, service, characteristic).then(data => {
                    const buffer = Buffer.from(data);
                    const stringData = buffer.toString();
                    console.log('[DEBUG CODE](145) 读取服务: ', stringData);
                })
                .catch(err => {
                    console.log('[ERROR CODE](148) 读取失败: ', err)
                })
                break;
            case 'Write':
                // 写入服务

                // 根据官方文档提示, 将要传输数据进行转换为数字数组(Number[]), 并将数据使用Buffer.toJSON().data转换
                // 这里使用时间代替, 相关的数据格式请根据实际项目进行处理
                const data = new Date().getTime(); 

                // 使用TextEncoder进行编码, 再将数据传输到Buffer.from()进行转换为数字数组
                const dataBuffer = Buffer.from(new TextEncoder().encode(data)); 
                bleManager.write(pid, service, characteristic, dataBuffer.toJSON().data).then(() => {
                    console.log('[DEBUG CODE](159) 写入成功')
                })
                .catch(err => {
                    console.log('[ERROR CODE](162) 写入失败: ', err)
                })
                break;
            default:
                console.log('NOTHING HERE')
                break;
        }
    }

    /**
     * renderItem
     */
    const renderItem = ({item}) => {
        return (
            <TouchableHighlight style={{
                padding: 10,
                marginBottom: 12,
                backgroundColor: '#efefff'
            }} onPress={() => {
                handlerConnectPeripheral(item)
            }}>
                <View>
                    <Text>{item.name ?? 'NoName'}</Text>
                    <Text>{item.id}</Text>
                </View>
            </TouchableHighlight>
        )
    }

    return (
        <View style={[styles.container, {marginTop: useSafeAreaInsets().top}]}>
            <Text>BleManager</Text>
            <Button title={'开始扫描'} onPress={handlerScanBle}/>
            <Button title={'断开蓝牙'} onPress={() => {bleManager.disconnect(connectDevice.peripheral)}} disabled={!isConnect}/>

            {!isConnect ?
                <FlatList
                    style={{flex: 1}}
                    data={Array.from(peripherals.values())}
                    renderItem={renderItem}
                />
                :
                <FlatList
                    data={peripheralData}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({item, index}) => (
                        <View style={[styles.view, {marginBottom: 10, backgroundColor: '#c0c0c4'}]} key={index}>
                            <Text>{item.characteristic}</Text>
                            {item.properties.map((t, i) => (
                                <Button
                                    title={t}
                                    onPress={() => {
                                        handleService(item, t)
                                    }}
                                    styles={{
                                        backgroundColor: '#67dc5e',
                                        color: '#fcfcfc'
                                    }}
                                    key={i}
                                />
                            ))}
                        </View>
                    )}
                />
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
})
```

完整项目示例请前往Github进行查看

## 3. 简单总结

本文简述使用Expo项目进行集成蓝牙功能, 实际还有`react-native-ble-plx`, 这个包API要比`react-native-ble-manager`多, 但是文档阅读有点难度, 感兴趣的可以去看看



## 附录

[Github 完整示例代码](https://github.com/p0ssword/expo-ble)

[react-native-ble-manager](https://innoveit.github.io/react-native-ble-manager/)
