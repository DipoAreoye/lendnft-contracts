import { SafeVersion } from '@gnosis.pm/safe-core-sdk-types'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment): Promise<void> => {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const { deploy } = deployments

  await deploy("GnosisSafe_SV1_3_0", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true
  })

  await deploy("ProxyFactory_SV1_3_0", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true
  })

  await deploy("BoredApeYachtClub", {
    from: deployer,
    args: ["Bored Ape Yacht Club", "BAYC", 10000, 1],
    log: true,
    deterministicDeployment: true
  })
  //
  // console.log('Deploy 0')
  //
  // await deploy("BrentModule", {
  //   from: deployer,
  //   args: ["0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "115"],
  //   log: true,
  //   deterministicDeployment: true
  // })

}

export default deploy
