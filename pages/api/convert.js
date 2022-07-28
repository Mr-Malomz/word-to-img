import cloudinary from 'cloudinary';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function convert(req, res) {
  const cld = cloudinary.v2;
  const form = new IncomingForm();

  cld.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_API_KEY,
    api_secret: process.env.NEXT_PUBLIC_API_SECRET,
  });

  if (!fs.existsSync('./public/uploads')) {
    fs.mkdirSync('./public/uploads', { recursive: true });
  }

  form.parse(req, (err, fields, files) => {
    console.log(files);
    if (err) {
      res.status(500).json({ msg: err });
      return;
    }
    let tempFilePath = files.file.filepath;
    let projectFilePath = `./public/uploads/${files.file.originalFilename}`;

    fs.rename(tempFilePath, projectFilePath, (err) => {
      if (err) {
        console.log(err);
      }
    });

    cld.uploader.upload(
      projectFilePath,
      { resource_type: 'raw', raw_convert: 'aspose' },
      function (error, result) {
        if (result) {
          res.status(200).json({
            msg: 'document converted successfully!',
            data: result,
          });

          //clean up
          fs.unlinkSync(projectFilePath);
        } else {
          res.status(500).json({ msg: error.message });
        }
      }
    );
    return;
  });
}
