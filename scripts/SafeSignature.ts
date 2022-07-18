import { SafeSignature } from '@gnosis.pm/safe-core-sdk-types'

class EthSignSignature implements SafeSignature {
  signer: string
  data: string

  /**
   * Creates an instance of a Safe signature.
   *
   * @param signer - Ethers signer
   * @param signature - The Safe signature
   * @returns The Safe signature instance
   */
  constructor(signer: string, signature: string) {
    this.signer = signer
    this.data = signature
  }

  /**
   * Returns the static part of the Safe signature.
   *
   * @returns The static part of the Safe signature
   */
  staticPart(/* dynamicOffset: number */) {
    return this.data
  }

  /**
   * Returns the dynamic part of the Safe signature.
   *
   * @returns The dynamic part of the Safe signature
   */
  dynamicPart() {
    return ''
  }

  encodeSignature() : string {
    let staticParts = ''
    let dynamicParts = ''
    staticParts += this.staticPart().slice(2)
    dynamicParts += this.dynamicPart()
    return '0x' + staticParts + dynamicParts
  }
}

export default EthSignSignature
