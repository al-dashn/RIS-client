Pod::Spec.new do |s|
  s.name             = 'DTSRIS'
  s.version          = '0.2.0'
  s.summary          = 'DTS RIS iOS SDK — zero-PII analytics auto-capture'
  s.description      = <<-DESC
    DTS RIS iOS SDK automatically captures anonymous user-journey events
    (screen views, errors, cart updates, customizations) and sends them
    to the DTS RIS ingestion endpoint. Zero-PII by design.
  DESC
  s.homepage         = 'https://github.com/al-dashn/RIS-client'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'DTS RIS Team' => 'a.salvaggio@dashn.com' }
  s.source           = { :git => 'https://github.com/al-dashn/RIS-client.git', :tag => s.version.to_s }
  s.swift_versions   = ['5.9']

  s.ios.deployment_target = '15.0'
  s.macos.deployment_target = '12.0'
  s.tvos.deployment_target = '15.0'
  s.watchos.deployment_target = '8.0'

  s.source_files = 'ios/Sources/DTSRIS/**/*.swift'
end
