import {PermissionsAndroid, Platform} from 'react-native';
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
      // 如果所有权限都被授予，返回 true
      return await requestAndroid31Permissions();
    }
  } else {
    // 非 Android 系统，默认返回 true
    return true;
  }
};

// 导出权限请求函数
export default requestPermissions;
