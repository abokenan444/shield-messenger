#import <React/RCTBridgeModule.h>

/**
 * Objective-C bridge macro to register the Swift RustBridge module
 * with React Native's NativeModules system.
 */

@interface RCT_EXTERN_MODULE(RustBridge, NSObject)

// Core
RCT_EXTERN_METHOD(init:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getVersion:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Identity
RCT_EXTERN_METHOD(generateIdentityKeypair:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generateX25519Keypair:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deriveSharedSecret:(NSString *)ourPrivateKey
                  theirPublicKey:(NSString *)theirPublicKey
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Encryption
RCT_EXTERN_METHOD(encrypt:(NSString *)plaintext
                  key:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Password
RCT_EXTERN_METHOD(hashPassword:(NSString *)password
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Safety Numbers
RCT_EXTERN_METHOD(generateSafetyNumber:(NSString *)ourIdentity
                  theirIdentity:(NSString *)theirIdentity
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
