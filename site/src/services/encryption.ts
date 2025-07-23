import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

import api from "@api";

/**
 * Получаем публичный и приватный ключ для чата.
 * 
 * @param chatData - Данные чата
 * @param token - User token (Требуется для потверждения)
 * @returns PrivateKey, PubKey
 */
export async function getKey(
    chatData:{ chat: { id:string, userAId:string, userB:string, userBId:string } }, 
    token:string = localStorage.getItem("token") ?? ''
){
    if(token==='' || !token) return;
    const res = await api.post('/chat/keys', {
        userClass: chatData.chat.userAId !== chatData.chat.userB ? 'A' : 'B',
        userId: chatData.chat.userAId !== chatData.chat.userB ? chatData.chat.userAId : chatData.chat.userBId,
      
        key: {
            chatID: chatData.chat.id,
            userA: chatData.chat.userAId,
            userB: chatData.chat.userBId
        }
    },{
        headers: {
            Authorization: `Bearer ${token}`
        }
    });


    const dataRes = await res.json();
    if(dataRes.error==="Keys not found") {
        const result:{error:string} = { error: "Keys not found"};
        return result
    } else {
        const result:{ PrivateKey:string, PubKey:string } = dataRes;
        return result
    }
}

/**
 * Отправляем запрос на создания ключей для чата.
 * 
 * @param chatData - Данные чата
 * @param token - User token (Требуется для потверждения)
 * @returns PrivateKey, PubKey
 */
export async function createKey(
    chatData:{ chat: { id:string, userAId:string, userB:string, userBId:string } }, 
    token:string = localStorage.getItem("token") ?? ''
){
    if(token==='' || !token) return;
    const res = await api.post('/chat/keys/create', {
        userClass: chatData.chat.userAId !== chatData.chat.userB ? 'A' : 'B',
        userId: chatData.chat.userAId !== chatData.chat.userB ? chatData.chat.userAId : chatData.chat.userBId,
      
        key: {
            chatID: chatData.chat.id,
            userA: chatData.chat.userAId,
            userB: chatData.chat.userBId
        }
    },{
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const dataRes:{
        PrivateKey:string, PubKey:string
    } = await res.json();

    return dataRes;
}

/**
 * Функция для шифрования сообщений между пользователем и сервером.
 * 
 * @param message - Сообщение пользователя
 * @param chatId - ID чата
 * @param PubKey - Публичный ключ чата (Опционально)
 * @param PrivateKey - Приватный ключ юзера для чата (Опционально)
 * @returns Зашифрованный текст
 */
export const handleEncryption = function(
    message:string, 
    chatId:string, 
    PubKey:string = localStorage.getItem(`${chatId}-PubKey`) ?? '', 
    PrivateKey:string = localStorage.getItem(`${chatId}-PrivateKey`) ?? ''
){
    if (PubKey==='' || PrivateKey==='' ) return message;
    
    const nonce = new Uint8Array(24);
  
    const pubKey = naclUtil.decodeBase64(PubKey);
    const privKey = naclUtil.decodeBase64(PrivateKey);
  
    const encrypted = nacl.box(
        naclUtil.decodeUTF8(message),
        nonce,
        pubKey,
        privKey
    );
  
    return naclUtil.encodeBase64(encrypted)
}

/**
 * Функция для расшифровки сообщений полученых от сервера.
 * 
 * @param message - Сообщение полученое от сервера
 * @param chatId - ID чата
 * @param PubKey - Публичный ключ чата (Опционально)
 * @param PrivateKey - Приватный ключ юзера для чата (Опционально)
 * @returns Разшифрованный текст
 */
export const handleDecryption = function(
    message:string, 
    chatId:string, 
    PubKey:string = localStorage.getItem(`${chatId}-PubKey`) ?? '', 
    PrivateKey:string = localStorage.getItem(`${chatId}-PrivateKey`) ?? ''
){
    if (PubKey==='' || PrivateKey==='' ) return message;

    const nonce = new Uint8Array(24);
  
    const pubKey = naclUtil.decodeBase64(PubKey);
    const privKey = naclUtil.decodeBase64(PrivateKey);
  
    const decrypted = nacl.box.open(
        naclUtil.decodeBase64(message),
        nonce,
        pubKey,
        privKey
    );
  
    if (!decrypted) return null;
  
    return naclUtil.encodeUTF8(decrypted);
}