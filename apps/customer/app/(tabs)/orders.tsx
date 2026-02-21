import React from 'react';
import {View,Text,Pressable} from 'react-native';
import {router} from 'expo-router';
import {HALHA_THEME} from '@halha/ui';
export default function Orders(){return <View style={{flex:1,padding:16,backgroundColor:HALHA_THEME.colors.bg}}><Text style={{fontSize:18,fontWeight:'900',color:HALHA_THEME.colors.text}}>الطلبات</Text><View style={{height:12}}/><Pressable onPress={()=>router.push('/tracking/demo')} style={{padding:16,borderRadius:16,backgroundColor:HALHA_THEME.colors.surface,borderWidth:1,borderColor:HALHA_THEME.colors.border}}><Text style={{fontWeight:'900',color:HALHA_THEME.colors.text}}>تتبع طلب تجريبي</Text></Pressable></View>}
