import fs from 'fs'
import path from 'path'
import Encryption from '../../libs/Encryption'
import Config from '../../libs/Config'

const mkdirPromise = fs.promises.mkdir
const writeFilePromise = fs.promises.writeFile
const readFilePromise = fs.promises.readFile

export default function FileHandler(
  connector: IFndrConnector,
  encryptionSecret: string
) {
  const config = Config(connector.name)
  const encryption = Encryption({ secret: encryptionSecret })

  return {
    filepath: path.join(config.confDir, `fileSystemData`),

    async getAndDecryptFlatFile() {
      if (this.doesDirectoryExist(config.confDir)) {
        if (this.doesFileExist(this.filepath)) {
          const rawFileData = await readFilePromise(this.filepath, 'utf-8')
          if (rawFileData.length === 0) return null
          else {
            try {
              const accountsJson = JSON.parse(
                (await encryption.decrypt(rawFileData)) || '{}'
              )
              return accountsJson
            } catch (err) {
              throw `We're having a problem parsing your flat file at '${this.filepath}'.
                This is likely due to a different master password, environment variable CRYPT_SECRET,
                being used that previously was set. Make sure you have the correct
                secret you used before and try again.`.replace(/\n\s+/g, '\n')
            }
          }
        } else {
          await writeFilePromise(this.filepath, '')
          return null
        }
      }

      await mkdirPromise(config.confDir)
      await writeFilePromise(this.filepath, '')
      return ''
    },

    async writeObjToFile(obj: any, origObj = {}) {
      const newObj = Object.assign(origObj, obj)
      const encryptedString = await encryption.encrypt(JSON.stringify(newObj))
      return await writeFilePromise(this.filepath, encryptedString)
    },

    doesDirectoryExist(dirPath: string): boolean {
      try {
        const exists = fs.statSync(dirPath).isDirectory()
        return exists
      } catch (e) {
        return false
      }
    },

    doesFileExist(filePath: string): boolean {
      try {
        const exists = fs.statSync(filePath).isFile()
        return exists
      } catch (e) {
        return false
      }
    },
  }
}
