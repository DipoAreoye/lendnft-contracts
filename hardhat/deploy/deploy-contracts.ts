import { SafeVersion } from '@gnosis.pm/safe-core-sdk-types'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment): Promise<void> => {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const { deploy } = deployments


  // await deploy("GnosisSafeProxyFactory", {
  //   from: deployer,
  //   args: [],
  //   log: true,
  //   deterministicDeployment: true
  // })
  //
  // console.log('Deploy 1')
  //
  // await deploy("GnosisSafe", {
  //   from: deployer,
  //   args: [],
  //   log: true,
  //   deterministicDeployment: true
  // })

  await deploy("BrentGuard", {
    from: deployer,
    args: ["0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483"],
    log: true,
    deterministicDeployment: true
  })

  console.log('Deploy 0')

  await deploy("BrentModule", {
    from: deployer,
    args: ["0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "115"],
    log: true,
    deterministicDeployment: true
  })

}

export default deploy
